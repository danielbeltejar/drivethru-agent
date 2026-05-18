"""
Punto de entrada de la aplicación FastAPI para COSMO BURGER.

Configura la aplicación, el middleware CORS, los routers y carga
el menú desde disco al arrancar.
"""

import json
import os
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.MenuRouter import menu_router
from routers.OrderRouter import order_router
from routers.HealthRouter import health_router
from routers.TranscribeRouter import transcribe_router

app = FastAPI(title="COSMO BURGER API")
app.include_router(menu_router)
app.include_router(order_router)
app.include_router(health_router)
app.include_router(transcribe_router)

# noinspection PyTypeChecker
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Cargar el menú en memoria al importar el módulo para que todos los routers
# puedan acceder a él sin lecturas adicionales de disco
menu_path = os.path.join(os.path.dirname(__file__), "data", "menu.json")
with open(menu_path) as f:
    menu = json.load(f)

# Endpoints cuyas peticiones no deben aparecer en los logs de acceso
block_endpoints = ["/healthz"]


class LogFilter(logging.Filter):
    """Filtro de logging que suprime entradas de endpoints ruidosos como /healthz."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Devuelve False (suprime) si el registro corresponde a un endpoint bloqueado."""
        if record.args and len(record.args) >= 3:
            if record.args[2] in block_endpoints:
                return False
        return True


uvicorn_logger = logging.getLogger("uvicorn.access")
uvicorn_logger.addFilter(LogFilter())

