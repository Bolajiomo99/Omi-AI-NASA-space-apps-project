
import pandas as pd

from services.data_service import prepare_time_series
from services.analysis_service import analyze_series


def analyze_uploaded_csv(
    file,
    date_column="date",
    value_column="value"
):

    try:
        dataframe = pd.read_csv(file)

    except Exception as error:
        raise ValueError(
            f"Could not read CSV file: {error}"
        )

    dataframe = prepare_time_series(
        dataframe,
        date_column,
        value_column
    )

    dates = dataframe["date"].dt.strftime(
        "%Y-%m-%d"
    ).tolist()

    values = dataframe["value"].astype(
        float
    ).tolist()

    return analyze_series(
        dates,
        values
    )
