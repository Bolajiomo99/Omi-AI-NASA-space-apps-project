
from processing.trend_analysis import calculate_trend
from processing.statistical_analysis import calculate_statistics
from processing.regional_comparison import compare_series


def analyze_series(dates, values):

    trend = calculate_trend(
        dates,
        values
    )

    statistics = calculate_statistics(
        values
    )

    return {
        "trend": trend,
        "statistics": statistics
    }


def compare_regions(region_a, region_b):

    return compare_series(
        region_a,
        region_b
    )
