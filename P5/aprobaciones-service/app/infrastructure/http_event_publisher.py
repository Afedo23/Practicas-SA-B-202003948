import os
import requests

from app.domain.event_publisher import EventPublisherBase

SOLICITUDES_URL = os.getenv("SOLICITUDES_SERVICE_URL", "http://solicitudes-service:4002")
NOTIFICACIONES_URL = os.getenv("NOTIFICACIONES_SERVICE_URL", "http://notificaciones-service:4004")


class HttpEventPublisher(EventPublisherBase):
    """Un fallo al notificar no debe romper la resolución del paso (mismo
    criterio que HttpNotificacionesPublisher en solicitudes-service)."""

    def publicar(self, evento: str, payload: dict) -> None:
        try:
            requests.post(f"{NOTIFICACIONES_URL}/notificaciones",
                          json={"evento": evento, "payload": payload}, timeout=3)
        except requests.RequestException as err:
            print(f"No se pudo publicar la notificación: {err}")

    def actualizar_estado_solicitud(self, solicitud_id: int, estado: str) -> None:
        try:
            requests.patch(f"{SOLICITUDES_URL}/solicitudes/{solicitud_id}/estado",
                            json={"estado": estado}, timeout=3)
        except requests.RequestException as err:
            print(f"No se pudo actualizar el estado de la solicitud: {err}")