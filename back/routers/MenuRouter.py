"""Router del menú — expone el catálogo de productos de COSMO BURGER."""
import logging

from fastapi import APIRouter

import main

menu_router = APIRouter()
logger = logging.getLogger()


@menu_router.get("/menu")
async def get_menu():
    """Devuelve el menú completo con categorías, artículos, precios y tasa de IVA."""
    return main.menu
