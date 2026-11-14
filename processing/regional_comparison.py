
from processing.trend_analysis import calculate_trend


def compare_series(region_a, region_b):

    required = ["name", "dates", "values"]

    for region in [region_a, region_b]:

        if not all(key in region for key in required):
            raise ValueError(
                "Each region must contain name, dates and values."
            )

    trend_a = calculate_trend(
        region_a["dates"],
        region_a["values"]
    )

    trend_b = calculate_trend(
        region_b["dates"],
        region_b["values"]
    )

    return {
        "region_a": {
            "name": region_a["name"],
            "trend": trend_a
        },
        "region_b": {
            "name": region_b["name"],
            "trend": trend_b
        },
        "note": (
            "Both datasets must use compatible variables, "
            "units, periods and spatial aggregation methods."
        )
    }
