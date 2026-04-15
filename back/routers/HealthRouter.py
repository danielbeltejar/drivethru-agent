"""Router de salud — endpoint /healthz para comprobaciones de disponibilidad."""
import logging
from http import HTTPStatus

from fastapi import APIRouter
from fastapi import status

health_router = APIRouter()
logger = logging.getLogger()


@health_router.get("/healthz", status_code=status.HTTP_200_OK)
def heath_check():
    """Devuelve 200 OK para indicar que el servicio está en funcionamiento."""
    return HTTPStatus.OK
