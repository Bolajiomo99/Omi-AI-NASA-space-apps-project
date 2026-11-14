
from app import create_app


def test_upload_requires_file():

    app = create_app()
    app.config["TESTING"] = True

    response = app.test_client().post(
        "/api/uploads/analyze"
    )

    assert response.status_code == 400
