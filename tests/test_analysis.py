
from processing.trend_analysis import calculate_trend
from processing.statistical_analysis import calculate_statistics


def test_trend_detects_increase():

    result = calculate_trend(
        [
            "2020-01-01",
            "2021-01-01",
            "2022-01-01",
            "2023-01-01"
        ],
        [10, 11, 12, 13]
    )

    assert result["direction"] == "increasing"


def test_statistics_count():

    result = calculate_statistics(
        [2, 3, 4, 5]
    )

    assert result["count"] == 4
