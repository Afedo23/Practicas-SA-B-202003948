from abc import ABC, abstractmethod


class EventPublisherBase(ABC):
    """
    DIP: AprobacionService depende de esta abstracción, no de una
    implementación concreta de cliente HTTP. Permite notificar el
    resultado del flujo a otros servicios (solicitudes-service,
    notificaciones-service) sin acoplar la lógica de negocio al
    transporte usado.
    """

    @abstractmethod
    def publicar(self, evento: str, payload: dict) -> None: ...

    @abstractmethod
    def actualizar_estado_solicitud(self, solicitud_id: int, estado: str) -> None: ...