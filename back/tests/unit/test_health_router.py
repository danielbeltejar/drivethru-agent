from tests.unit.conftest import client


def test_healthz_returns_200():
    response = client.get("/healthz")
    assert response.status_code == 200
