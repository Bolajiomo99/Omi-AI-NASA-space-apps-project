
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "development-secret-change-this"
    )

    DEBUG = os.getenv(
        "FLASK_DEBUG", "false"
    ).lower() == "true"

    MAX_CONTENT_LENGTH = 10 * 1024 * 1024

    UPLOAD_FOLDER = "data/raw"

    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

    EARTHDATA_TOKEN = os.getenv("EARTHDATA_TOKEN")
