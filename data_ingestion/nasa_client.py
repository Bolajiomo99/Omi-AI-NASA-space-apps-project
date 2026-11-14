import earthaccess
import requests
from dotenv import load_dotenv
from rainfall import rainfall
import os


load_dotenv()

EARTHDATA_USERNAME=os.getenv("EARTHDATA_USERNAME")
EARTHDATA_PASSWORD=os.getenv("EARTHDATA_PASSWORD")

auth = earthaccess.login()
token = earthaccess.get_edl_token()['access_token']

time_series_url = "https://api.giovanni.earthdata.nasa.gov/timeseries"

def call_time_series(lat, lon, time_start, time_end, dataset):
    """
    INPUTS:
    lat - latitude
    lon - longitude
    time_start - start of time series in YYYY-MM-DDThh:mm:ss format (UTC)
    end_time - end of the time series in YYYY-MM-DDThh:mm:ss format (UTC)
    dataset - name of the data parameter for the time series

    OUTPUT:
    time series csv output string
    """
    query_parameters = {
        "data":dataset,
        "location":"[{},{}]".format(lat,lon),
        "time":"{}/{}".format(time_start,time_end)
    }

    headers = {
    'Authorization': f'Bearer {token}'
    }

    response=requests.get(time_series_url, params=query_parameters, headers=headers)
    return response.text


print(call_time_series(**rainfall))