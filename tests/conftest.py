import math
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from services import nasa_service  # noqa: E402


def fake_power_values(parameter, region_id, start=1981, end=2025):
    """Deterministic synthetic POWER-style payload: seasonal cycle + trend."""
    values = {}
    warming = 0.03 if region_id == "lagos" else 0.01
    for year in range(start, end + 1):
        for month in range(1, 14):
            key = f"{year}{month:02d}"
            if month == 13:
                values[key] = 0.0
                continue
            season = math.sin((month - 1) / 12 * 2 * math.pi)
            wobble = ((year * 7 + month * 3) % 5 - 2) * 0.05
            if parameter == "T2M":
                values[key] = round(26.5 + 1.2 * season + warming * (year - start) + wobble, 2)
            else:
                values[key] = round(max(0.0, 5 + 4 * season + wobble * 2), 2)
    return values


@pytest.fixture
def app(tmp_path, monkeypatch):
    calls = []

    def fake_request(region, parameter, start, end):
        calls.append((region["id"], parameter))
        return {"retrieved_at": "2026-01-01T00:00:00+00:00",
                "values": fake_power_values(parameter, region["id"], start, end)}

    monkeypatch.setattr(nasa_service, "_request_power", fake_request)
    nasa_service.clear_cache()
    application = create_app({
        "TESTING": True,
        "CACHE_FOLDER": str(tmp_path),
        "DATA_END_YEAR": 2025,
        "GOOGLE_API_KEY": None,
    })
    application.power_calls = calls
    yield application
    nasa_service.clear_cache()


@pytest.fixture
def client(app):
    return app.test_client()
