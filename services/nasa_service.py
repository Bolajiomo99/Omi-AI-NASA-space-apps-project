"""NASA POWER data retrieval.

Product: NASA POWER (Prediction Of Worldwide Energy Resources) Monthly &
Annual point API, v2. Meteorology is derived from NASA GMAO MERRA-2
(~0.5° x 0.625° grid). No authentication is required.

Variables used:
  * T2M          Temperature at 2 metres, monthly mean, °C
  * PRECTOTCORR  Bias-corrected precipitation, monthly mean rate, mm/day
                 (converted here to a monthly total in mm)

Each region/parameter is fetched once for the full supported record and
cached on disk (data/processed) and in memory, so later investigations are
instant and a demo keeps working if the API is briefly unavailable.
"""

import calendar
import json
import os
import threading
from datetime import datetime, timezone

import pandas as pd
import requests
from flask import current_app

FILL_VALUE = -999.0

_memory_cache = {}
_lock = threading.Lock()


class NasaDataError(Exception):
    """Raised when NASA POWER data cannot be retrieved or is invalid."""


def get_region(region_id):
    regions = current_app.config["REGIONS"]
    region = regions.get(str(region_id or "").lower())
    if not region:
        raise ValueError(
            f"Unknown region '{region_id}'. Supported: {', '.join(regions)}."
        )
    return region


def get_variable(variable_id):
    variables = current_app.config["VARIABLES"]
    variable = variables.get(str(variable_id or "").lower())
    if not variable:
        raise ValueError(
            f"Unknown variable '{variable_id}'. Supported: {', '.join(variables)}."
        )
    return variable


def source_metadata(region, variable):
    cfg = current_app.config
    return {
        "dataset": "NASA POWER Monthly & Annual API (v2)",
        "underlying_product": "NASA GMAO MERRA-2 reanalysis",
        "parameter": variable["parameter"],
        "parameter_name": variable["long_name"],
        "native_unit": "°C" if variable["parameter"] == "T2M" else "mm/day",
        "spatial_resolution": "0.5° latitude x 0.625° longitude grid cell",
        "temporal_resolution": "Monthly",
        "location": {
            "latitude": region["latitude"],
            "longitude": region["longitude"],
        },
        "coverage": {
            "start_year": cfg["DATA_START_YEAR"],
            "end_year": cfg["DATA_END_YEAR"],
        },
        "endpoint": cfg["NASA_POWER_URL"],
        "documentation": "https://power.larc.nasa.gov/docs/",
    }


def _cache_path(region_id, parameter, start, end):
    folder = current_app.config["CACHE_FOLDER"]
    os.makedirs(folder, exist_ok=True)
    return os.path.join(folder, f"power_{region_id}_{parameter}_{start}_{end}.json")


def _request_power(region, parameter, start, end):
    cfg = current_app.config
    params = {
        "parameters": parameter,
        "community": "AG",
        "latitude": region["latitude"],
        "longitude": region["longitude"],
        "start": start,
        "end": end,
        "format": "JSON",
    }
    try:
        response = requests.get(
            cfg["NASA_POWER_URL"], params=params, timeout=cfg["NASA_POWER_TIMEOUT"]
        )
    except requests.RequestException as error:
        raise NasaDataError(f"Could not reach NASA POWER: {error}") from error

    if response.status_code != 200:
        detail = response.text[:300]
        raise NasaDataError(
            f"NASA POWER returned HTTP {response.status_code}: {detail}"
        )

    try:
        payload = response.json()
        values = payload["properties"]["parameter"][parameter]
    except (ValueError, KeyError, TypeError) as error:
        raise NasaDataError("NASA POWER returned an unexpected response.") from error

    if not isinstance(values, dict) or not values:
        raise NasaDataError("NASA POWER returned no records.")

    return {
        "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "values": values,
    }


def _load_raw(region, variable):
    cfg = current_app.config
    start, end = cfg["DATA_START_YEAR"], cfg["DATA_END_YEAR"]
    key = (region["id"], variable["parameter"], start, end)

    with _lock:
        if key in _memory_cache:
            return _memory_cache[key]

        path = _cache_path(region["id"], variable["parameter"], start, end)
        raw = None
        if os.path.exists(path):
            try:
                with open(path, encoding="utf-8") as handle:
                    raw = json.load(handle)
            except (OSError, ValueError):
                raw = None

        if raw is None:
            raw = _request_power(region, variable["parameter"], start, end)
            try:
                with open(path, "w", encoding="utf-8") as handle:
                    json.dump(raw, handle)
            except OSError:
                pass  # caching is best-effort

        _memory_cache[key] = raw
        return raw


def parse_power_monthly(values, parameter):
    """Convert POWER's {"YYYYMM": value} mapping into a monthly DataFrame.

    Month "13" is POWER's annual summary and is skipped; fill values (-999)
    become missing. Precipitation rates (mm/day) become monthly totals (mm).
    """
    rows = []
    for key, value in values.items():
        key = str(key)
        if len(key) != 6 or not key.isdigit():
            continue
        year, month = int(key[:4]), int(key[4:])
        if not 1 <= month <= 12:
            continue
        try:
            number = float(value)
        except (TypeError, ValueError):
            number = None
        if number is None or number <= FILL_VALUE + 1e-6:
            number = None
        elif parameter == "PRECTOTCORR":
            number = number * calendar.monthrange(year, month)[1]
        rows.append({"date": pd.Timestamp(year=year, month=month, day=1), "value": number})

    frame = pd.DataFrame(rows, columns=["date", "value"])
    if frame.empty:
        return frame
    frame["value"] = pd.to_numeric(frame["value"], errors="coerce")
    return frame.sort_values("date").reset_index(drop=True)


def fetch_environmental_data(region_id, variable_id, start_year, end_year):
    """Return monthly records for a region/variable within [start_year, end_year].

    Returns a dict with the monthly DataFrame and provenance metadata.
    """
    region = get_region(region_id)
    variable = get_variable(variable_id)
    raw = _load_raw(region, variable)

    frame = parse_power_monthly(raw["values"], variable["parameter"])
    if frame.empty:
        raise NasaDataError("No valid NASA POWER records were found.")

    mask = (frame["date"].dt.year >= start_year) & (frame["date"].dt.year <= end_year)
    frame = frame[mask].reset_index(drop=True)

    metadata = source_metadata(region, variable)
    metadata["retrieved_at"] = raw.get("retrieved_at")

    return {
        "region": region,
        "variable": variable,
        "monthly": frame,
        "source": metadata,
    }


def clear_cache():
    with _lock:
        _memory_cache.clear()
