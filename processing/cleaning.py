
import pandas as pd


def clean_time_series(dataframe):
    df = dataframe.copy()

    df["date"] = pd.to_datetime(
        df["date"],
        errors="coerce"
    )

    df["value"] = pd.to_numeric(
        df["value"],
        errors="coerce"
    )

    df = df.dropna(
        subset=["date", "value"]
    )

    df = df.sort_values("date")

    df = df.drop_duplicates(
        subset=["date"],
        keep="last"
    )

    return df.reset_index(drop=True)
