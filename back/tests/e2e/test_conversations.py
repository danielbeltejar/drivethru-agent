"""
Tests E2E de conversación contra el backend REAL con el LLM.

Simulan interacciones reales de un cliente en el autoservicio y verifican:
  - Los artículos del pedido nunca desaparecen del panel.
  - El pedido se cierra correctamente tras la pregunta del método de pago.
  - Los precios coinciden con el menú.
  - Los pedidos de varios artículos se acumulan correctamente.
  - Las sugerencias de Alex no se añaden al pedido.

Ejecución:  pytest tests/e2e/ -v -s
Requisito:  make dev en ejecución (backend + ollama)
"""

import uuid
import pytest
import httpx

BASE_URL = "http://localhost:8000"
TIMEOUT = 45.0  # segundos por solicitud al LLM


def is_backend_running() -> bool:
    """Comprueba si el backend está levantado antes de ejecutar los tests."""
    try:
        httpx.get(f"{BASE_URL}/healthz", timeout=2.0)
        return True
    except Exception:
        return False


skip_if_not_running = pytest.mark.skipif(
    not is_backend_running(),
    reason="Backend no disponible (arranca con make dev)",
)

# Cargar los precios del menú para validaciones de precios en los tests
MENU_PRICES: dict[str, float] = {}
try:
    resp = httpx.get(f"{BASE_URL}/menu", timeout=5.0)
    menu = resp.json()
    TAX_RATE: float = menu.get("taxRate", 0.10)
    for cat in menu.get("categories", []):
        for item in cat.get("items", []):
            MENU_PRICES[item["name"].lower()] = item["price"]
except Exception:
    TAX_RATE = 0.10


def chat(client_id: str, message: str) -> dict:
    """Envía un mensaje al endpoint /chat y devuelve la respuesta parseada.

    Args:
        client_id: Identificador único de la sesión del cliente.
        message: Texto del mensaje del cliente (cadena vacía para el saludo inicial).

    Returns:
        Diccionario con claves: message, command, order.
    """
    resp = httpx.post(
        f"{BASE_URL}/chat",
        json={"clientId": client_id, "message": message},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200, f"Chat falló: {resp.status_code} {resp.text}"
    return resp.json()


def order_item_names(response: dict) -> list[str]:
    """Extrae los nombres de artículos de la respuesta del pedido."""
    return [i["name"] for i in response.get("order", {}).get("items", [])]


def order_total(response: dict) -> float:
    """Extrae el total del pedido de la respuesta."""
    return response.get("order", {}).get("total", 0)


# ── Test 1: Pedido de un artículo — flujo completo saludo → pedido → cierre ──

@skip_if_not_running
def test_single_item_full_flow():
    """Flujo completo con un solo artículo: saludo, pedido, confirmación y cierre."""
    cid = f"e2e-single-{uuid.uuid4().hex[:8]}"

    # Saludo inicial
    r = chat(cid, "")
    assert r["message"], "El saludo no debe estar vacío"
    assert r["command"] != "ban", f"Baneado en el saludo: {r['message']}"

    # Pedir un artículo
    r = chat(cid, "Quiero una Atómica por favor")
    assert r["command"] != "ban", f"Baneado inesperadamente: {r['message']}"
    items = order_item_names(r)
    assert any("atómica" in n.lower() for n in items), f"La Atómica no está en el pedido: {items}"

    # Indicar que ya no queremos nada más
    r = chat(cid, "Eso es todo")
    assert r["command"] != "ban"
    items = order_item_names(r)
    assert len(items) >= 1, f"El pedido perdió artículos tras 'eso es todo': {items}"

    # Responder al método de pago
    r = chat(cid, "Con tarjeta")
    if r["command"] != "close":
        # Algunos modelos necesitan un turno extra para cerrar
        r = chat(cid, "Sí, con tarjeta por favor")

    assert r["command"] == "close", (
        f"El pedido no se cerró tras la respuesta al pago. "
        f"Comando: '{r['command']}', Mensaje: '{r['message']}'"
    )
    assert len(r["order"]["items"]) >= 1, "El pedido debe tener artículos al cerrar"


# ── Test 2: Pedido de varios artículos — los artículos nunca deben desaparecer ──

@skip_if_not_running
def test_multi_item_order_items_persist():
    """Verifica que los artículos persisten al ir añadiendo más al pedido."""
    cid = f"e2e-multi-{uuid.uuid4().hex[:8]}"

    chat(cid, "")

    # Primer artículo
    r1 = chat(cid, "Ponme una Clásica")
    items1 = order_item_names(r1)
    assert any("clásica" in n.lower() for n in items1), f"La Clásica no encontrada: {items1}"

    # Segundo artículo — ambos deben estar presentes
    r2 = chat(cid, "Y también unas Patatas Galácticas")
    items2 = order_item_names(r2)
    names_lower = [n.lower() for n in items2]
    assert any("clásica" in n for n in names_lower), (
        f"¡La Clásica DESAPARECIÓ al añadir el segundo artículo! Artículos: {items2}"
    )
    assert any("patatas" in n or "galácticas" in n for n in names_lower), (
        f"Patatas Galácticas no encontradas: {items2}"
    )

    # Tercer artículo — los tres deben estar presentes
    r3 = chat(cid, "Un Refresco también")
    items3 = order_item_names(r3)
    names_lower3 = [n.lower() for n in items3]
    assert len(items3) >= 3, f"Se esperaban al menos 3 artículos, hay {len(items3)}: {items3}"
    assert any("clásica" in n for n in names_lower3), f"La Clásica desapareció: {items3}"
    assert any("patatas" in n or "galácticas" in n for n in names_lower3), f"Patatas desaparecidas: {items3}"
    assert any("refresco" in n for n in names_lower3), f"Refresco no encontrado: {items3}"

    # Finalizar — los artículos deben seguir ahí
    r4 = chat(cid, "Ya está, eso es todo")
    items4 = order_item_names(r4)
    assert len(items4) >= 3, (
        f"¡Artículos desaparecidos tras 'eso es todo'! Se esperaban >=3, hay {len(items4)}: {items4}"
    )


# ── Test 3: Los precios deben coincidir con el menú ──

@skip_if_not_running
def test_prices_match_menu():
    """Los precios unitarios devueltos deben coincidir con los del menú."""
    cid = f"e2e-prices-{uuid.uuid4().hex[:8]}"

    chat(cid, "")
    r = chat(cid, "Quiero un Volcán y unos Nuggets Estelares")
    order = r.get("order", {})
    items = order.get("items", [])

    for item in items:
        name = item["name"]
        menu_price = MENU_PRICES.get(name.lower())
        if menu_price is not None:
            assert abs(item["unitPrice"] - menu_price) < 0.02, (
                f"Precio incorrecto para {name}: menú={menu_price}, recibido={item['unitPrice']}"
            )

    # Verificar que el subtotal cuadra
    if items:
        expected_subtotal = sum(i["unitPrice"] * i["quantity"] for i in items)
        assert abs(order.get("subtotal", 0) - expected_subtotal) < 0.10, (
            f"Subtotal incorrecto: esperado ~{expected_subtotal}, recibido {order.get('subtotal')}"
        )


# ── Test 4: El pedido debe cerrarse siempre tras la respuesta al pago ──

@skip_if_not_running
def test_order_closes_after_payment():
    """El pedido debe cerrarse al responder al método de pago, sin quedarse bloqueado."""
    cid = f"e2e-close-{uuid.uuid4().hex[:8]}"

    chat(cid, "")
    chat(cid, "Una Atómica y un Refresco")
    chat(cid, "Nada más")

    # Responder con efectivo
    r = chat(cid, "Efectivo")
    if r["command"] != "close":
        r = chat(cid, "Sí, en efectivo")
    if r["command"] != "close":
        r = chat(cid, "Sí, confirmo")

    assert r["command"] == "close", (
        f"¡El pedido no se cerró! Último mensaje: '{r['message']}'"
    )


# ── Test 5: Cliente nuevo — pedido vacío desde el principio ──

@skip_if_not_running
def test_new_client_fresh_state():
    """Un cliente nuevo debe tener el pedido vacío al conectarse."""
    cid = f"e2e-fresh-{uuid.uuid4().hex[:8]}"
    r = chat(cid, "")
    order = r.get("order", {})
    assert len(order.get("items", [])) == 0, (
        f"El cliente nuevo debería tener el pedido vacío, recibido: {order}"
    )


# ── Test 6: Flujo conversacional — los artículos no deben perderse entre turnos ──

@skip_if_not_running
def test_conversational_flow_does_not_lose_items():
    """Los artículos del pedido deben persistir aunque el cliente haga preguntas."""
    cid = f"e2e-conv-{uuid.uuid4().hex[:8]}"

    chat(cid, "")

    r1 = chat(cid, "Ponme un Combo Atómica")
    items1 = order_item_names(r1)
    assert len(items1) >= 1, f"Sin artículos tras el primer pedido: {items1}"

    # Pregunta sin pedir nada
    r2 = chat(cid, "Hmm, ¿qué batidos tenéis?")
    items2 = order_item_names(r2)
    assert len(items2) >= 1, (
        f"¡Artículos desaparecidos tras una pregunta! {items2} (antes: {items1})"
    )

    # Añadir otro artículo
    r3 = chat(cid, "Ponme un Batido Cósmico de chocolate")
    items3 = order_item_names(r3)
    assert len(items3) >= 2, (
        f"Se esperaban >=2 artículos tras añadir el batido, hay {len(items3)}: {items3}"
    )


# ── Test 7: Las sugerencias de Alex NO deben añadirse al pedido ──

@skip_if_not_running
def test_suggestions_not_added_to_order():
    """Las sugerencias de Alex no deben aparecer en el pedido si el cliente no las confirma."""
    cid = f"e2e-suggest-{uuid.uuid4().hex[:8]}"

    chat(cid, "")

    # Pedir un artículo específico
    r1 = chat(cid, "Quiero una Clásica")
    items1 = order_item_names(r1)
    assert any("clásica" in n.lower() for n in items1), f"La Clásica no encontrada: {items1}"

    # Rechazar cualquier sugerencia de Alex
    r2 = chat(cid, "No, nada más gracias")
    items2 = order_item_names(r2)

    # Solo debe haber La Clásica — nada de lo que sugirió Alex
    assert len(items2) == 1, (
        f"Se esperaba exactamente 1 artículo (La Clásica), pero hay {len(items2)}: {items2}. "
        "¡Las sugerencias de Alex se añadieron incorrectamente al pedido!"
    )
    assert any("clásica" in n.lower() for n in items2), f"La Clásica desapareció: {items2}"


# ── Test 8: Preguntar sobre un artículo NO debe añadirlo al pedido ──

@skip_if_not_running
def test_asking_about_item_does_not_add():
    """Preguntar sobre un artículo ('¿Qué lleva?') no debe añadirlo al pedido."""
    cid = f"e2e-ask-{uuid.uuid4().hex[:8]}"

    chat(cid, "")

    # Preguntar sin pedir
    r1 = chat(cid, "¿Qué lleva La Atómica?")
    items1 = order_item_names(r1)
    assert len(items1) == 0, (
        f"Preguntar sobre un artículo no debería añadirlo al pedido, recibido: {items1}"
    )

    # Pedir algo diferente
    r2 = chat(cid, "Vale, ponme una Clásica")
    items2 = order_item_names(r2)
    assert any("clásica" in n.lower() for n in items2), f"La Clásica no encontrada: {items2}"
    # La Atómica no debe estar en el pedido — solo preguntamos por ella
    assert not any("atómica" in n.lower() for n in items2), (
        f"¡La Atómica se añadió solo por preguntar! Artículos: {items2}"
    )


# ── Test 9: Pedido largo de 5 artículos — acumulación y cierre completo ──

@skip_if_not_running
def test_long_five_item_order_to_completion():
    """Simula un pedido largo: 5 artículos uno a uno, verifica acumulación y cierre.

    Detecta el bug donde los artículos dejan de rastrearse en conversaciones largas.
    """
    cid = f"e2e-long-{uuid.uuid4().hex[:8]}"

    # Saludo inicial
    r = chat(cid, "")
    assert r["command"] != "ban"
    assert len(r["order"]["items"]) == 0, "El pedido de un cliente nuevo debe estar vacío"

    # Artículo 1: La Atómica
    r = chat(cid, "Ponme una Atómica")
    items = order_item_names(r)
    assert len(items) >= 1, f"Tras artículo 1, se esperaba >=1, hay {len(items)}: {items}"
    assert any("atómica" in n.lower() for n in items), f"La Atómica no encontrada: {items}"

    # Artículo 2: Patatas Galácticas
    r = chat(cid, "Añade unas Patatas Galácticas")
    items = order_item_names(r)
    names = [n.lower() for n in items]
    assert len(items) >= 2, f"Tras artículo 2, se esperaba >=2, hay {len(items)}: {items}"
    assert any("atómica" in n for n in names), f"La Atómica desapareció en paso 2: {items}"
    assert any("patatas" in n or "galácticas" in n for n in names), f"Patatas no encontradas: {items}"

    # Artículo 3: Refresco
    r = chat(cid, "También un Refresco")
    items = order_item_names(r)
    names = [n.lower() for n in items]
    assert len(items) >= 3, f"Tras artículo 3, se esperaba >=3, hay {len(items)}: {items}"
    assert any("atómica" in n for n in names), f"La Atómica desapareció en paso 3: {items}"
    assert any("patatas" in n or "galácticas" in n for n in names), f"Patatas desaparecidas: {items}"
    assert any("refresco" in n for n in names), f"Refresco no encontrado: {items}"

    # Artículo 4: Nuggets Estelares
    r = chat(cid, "Y unos Nuggets Estelares")
    items = order_item_names(r)
    names = [n.lower() for n in items]
    assert len(items) >= 4, f"Tras artículo 4, se esperaba >=4, hay {len(items)}: {items}"
    assert any("atómica" in n for n in names), f"La Atómica desapareció en paso 4: {items}"
    assert any("patatas" in n or "galácticas" in n for n in names), f"Patatas desaparecidas: {items}"
    assert any("refresco" in n for n in names), f"Refresco desapareció: {items}"
    assert any("nuggets" in n for n in names), f"Nuggets no encontrados: {items}"

    # Artículo 5: Helado Orbital
    r = chat(cid, "Dame un Helado Orbital")
    items = order_item_names(r)
    names = [n.lower() for n in items]
    assert len(items) >= 5, f"Tras artículo 5, se esperaba >=5, hay {len(items)}: {items}"
    assert any("atómica" in n for n in names), f"La Atómica desapareció en paso 5: {items}"
    assert any("patatas" in n or "galácticas" in n for n in names), f"Patatas desaparecidas: {items}"
    assert any("refresco" in n for n in names), f"Refresco desapareció: {items}"
    assert any("nuggets" in n for n in names), f"Nuggets desaparecieron: {items}"
    assert any("helado" in n for n in names), f"Helado no encontrado: {items}"

    # Finalizar — todos los artículos deben seguir ahí
    r = chat(cid, "Ya está, eso es todo")
    items = order_item_names(r)
    assert len(items) >= 5, (
        f"¡Artículos desaparecidos tras 'eso es todo'! Se esperaban >=5, hay {len(items)}: {items}"
    )

    # El total debe ser razonable para 5 artículos:
    # 9.99 + 3.49 + 2.49 + 4.99 + 2.99 = 23.95 + 10% IVA ≈ 26.35
    total = order_total(r)
    assert total > 20, f"El total parece demasiado bajo para 5 artículos: {total}"

    # Pagar y cerrar
    r = chat(cid, "Con tarjeta")
    if r["command"] != "close":
        r = chat(cid, "Sí, con tarjeta")
    if r["command"] != "close":
        r = chat(cid, "Sí, confirmo")

    assert r["command"] == "close", (
        f"¡El pedido no se cerró tras el pago! CMD='{r['command']}', MSG='{r['message']}'"
    )

    # El pedido final debe conservar todos los artículos
    items = order_item_names(r)
    assert len(items) >= 5, (
        f"¡Artículos perdidos al cerrar! Se esperaban >=5, hay {len(items)}: {items}"
    )
    total = order_total(r)
    assert total > 20, f"Total final demasiado bajo: {total}"
