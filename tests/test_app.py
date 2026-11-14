
from app import create_app


def test_health_endpoint():

    app = create_app()
    app.config["TESTING"] = True

    response = app.test_client().get("/health")

    assert response.status_code == 200

    assert response.get_json()["status"] == "ok"


def test_regions_endpoint():

    app = create_app()
    app.config["TESTING"] = True

    response = app.test_client().get("/api/regions")

    assert response.status_code == 200

    assert len(response.get_json()) == 2
