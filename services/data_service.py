
import pandas as pd

from processing.cleaning import clean_time_series
from processing.validation import validate_time_series


def prepare_time_series(
    dataframe,
    date_column,
    value_column
):

    if date_column not in dataframe.columns:
        raise ValueError(
            f"Date column '{date_column}' was not found."
        )

    if value_column not in dataframe.columns:
        raise ValueError(
            f"Value column '{value_column}' was not found."
        )

    df = dataframe[
        [date_column, value_column]
    ].copy()

    df.columns = ["date", "value"]

    df = clean_time_series(df)

    validate_time_series(df)

    return df
