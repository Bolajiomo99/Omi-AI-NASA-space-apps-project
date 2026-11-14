
import numpy as np
import pymannkendall as mk


def calculate_statistics(values):

    values = np.asarray(
        values,
        dtype=float
    )

    values = values[np.isfinite(values)]

    if len(values) < 3:
        raise ValueError(
            "At least three valid values are required."
        )

    result = mk.original_test(values)

    return {
        "count": int(len(values)),
        "mean": float(np.mean(values)),
        "median": float(np.median(values)),
        "minimum": float(np.min(values)),
        "maximum": float(np.max(values)),
        "standard_deviation": float(
            np.std(values, ddof=1)
        ),
        "mann_kendall": {
            "trend": str(result.trend),
            "p_value": float(result.p),
            "tau": float(result.Tau),
            "significant": bool(result.p < 0.05)
        }
    }
