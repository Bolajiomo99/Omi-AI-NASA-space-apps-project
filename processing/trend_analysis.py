
import pandas as pd
from scipy.stats import linregress


def calculate_trend(dates, values):

    if len(dates) != len(values):
        raise ValueError(
            "Dates and values must have equal lengths."
        )

    if len(values) < 3:
        raise ValueError(
            "At least three observations are required."
        )

    dates = pd.to_datetime(
        pd.Series(dates),
        errors="coerce"
    )

    values = pd.to_numeric(
        pd.Series(values),
        errors="coerce"
    )

    valid = dates.notna() & values.notna()

    dates = dates[valid]
    values = values[valid].astype(float)

    if len(values) < 3:
        raise ValueError(
            "Not enough valid observations."
        )

    elapsed_years = (
        dates - dates.min()
    ).dt.total_seconds() / (
        365.2425 * 24 * 60 * 60
    )

    result = linregress(
        elapsed_years,
        values
    )

    if result.slope > 0:
        direction = "increasing"
    elif result.slope < 0:
        direction = "decreasing"
    else:
        direction = "stable"

    return {
        "direction": direction,
        "slope_per_year": float(result.slope),
        "r_squared": float(result.rvalue ** 2),
        "p_value": float(result.pvalue),
        "observations": int(len(values)),
        "start_date": dates.min().strftime("%Y-%m-%d"),
        "end_date": dates.max().strftime("%Y-%m-%d"),
        "method": "Linear Regression"
    }
