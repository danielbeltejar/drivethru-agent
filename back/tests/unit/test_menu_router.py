from tests.unit.conftest import client


def test_get_menu_returns_data():
    response = client.get("/menu")
    assert response.status_code == 200
    data = response.json()
    assert "restaurant" in data
    assert data["restaurant"] == "COSMO BURGER"
    assert "categories" in data
    assert len(data["categories"]) > 0


def test_menu_has_all_categories():
    response = client.get("/menu")
    data = response.json()
    category_names = [c["name"] for c in data["categories"]]
    assert "Burgers" in category_names
    assert "Combos" in category_names
    assert "Bebidas" in category_names


def test_menu_items_have_prices():
    response = client.get("/menu")
    data = response.json()
    for category in data["categories"]:
        for item in category["items"]:
            assert "name" in item
            assert "price" in item
            assert isinstance(item["price"], (int, float))
            assert item["price"] > 0
