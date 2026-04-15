import pytest
import httpx

BASE_URL = "http://localhost:8000"


def is_backend_running():
    try:
        httpx.get(f"{BASE_URL}/healthz", timeout=2.0)
        return True
    except Exception:
        return False


pytestmark = pytest.mark.integration


@pytest.mark.skipif(not is_backend_running(), reason="Backend not running")
def test_health_check():
    response = httpx.get(f"{BASE_URL}/healthz")
    assert response.status_code == 200


@pytest.mark.skipif(not is_backend_running(), reason="Backend not running")
def test_get_menu():
    response = httpx.get(f"{BASE_URL}/menu")
    assert response.status_code == 200
    data = response.json()
    assert data["restaurant"] == "COSMO BURGER"


@pytest.mark.skipif(not is_backend_running(), reason="Backend not running")
def test_chat_endpoint():
    response = httpx.post(f"{BASE_URL}/chat", json={
        "clientId": "integration-test",
        "message": "hola"
    }, timeout=30.0)
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
