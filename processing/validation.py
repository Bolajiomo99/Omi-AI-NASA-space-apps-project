
def validate_time_series(dataframe):

    if dataframe.empty:
        raise ValueError(
            "The dataset contains no valid observations."
        )

    if len(dataframe) < 3:
        raise ValueError(
            "At least three observations are required."
        )

    if dataframe["date"].isna().any():
        raise ValueError(
            "Some dates are invalid."
        )

    if dataframe["value"].isna().any():
        raise ValueError(
            "Some measurement values are invalid."
        )

    return True
