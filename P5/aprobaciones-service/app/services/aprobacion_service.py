from typing import List, Optional
from app.domain.repository import AprobacionRepositoryBase
from app.domain.event_publisher import EventPublisherBase
from app.domain.models import Aprobacion, NuevaAprobacion

SECUENCIA = ["maker", "checker", "authorizer"]


class AprobacionService:
    """
    DIP: recibe un AprobacionRepositoryBase y un EventPublisherBase por
    constructor; no conoce SQLAlchemy, Postgres ni el transporte HTTP
    usado para notificar a otros servicios. SRP: concentra únicamente
    la regla de negocio del flujo de 3 pasos maker-checker-authorizer.
    """

    def __init__(self, repository: AprobacionRepositoryBase, publisher: EventPublisherBase):
        self.repository = repository
        self.publisher = publisher

    def iniciar_flujo(self, solicitud_id: int, usuario: str, comentario: Optional[str] = None) -> Aprobacion:
        """Crea el primer paso (maker) del flujo de aprobación de una solicitud."""
        data = NuevaAprobacion(solicitud_id=solicitud_id, paso="maker", usuario=usuario, comentario=comentario)
        return self.repository.crear_paso(data)

    def historial(self, solicitud_id: int) -> List[Aprobacion]:
        return self.repository.listar_por_solicitud(solicitud_id)

    def resolver(self, solicitud_id: int, paso: str, estado: str, usuario: str, comentario: Optional[str] = None):
        """
        Resuelve el paso pendiente actual. Si es aprobado y no es el
        último paso de la secuencia, crea automáticamente el siguiente
        paso pendiente (maker -> checker -> authorizer). Si es el
        último paso o si se rechaza, notifica a solicitudes-service
        y a notificaciones-service.
        """
        pendiente = self.repository.obtener_pendiente(solicitud_id, paso)
        if not pendiente:
            return None

        resuelto = self.repository.resolver_paso(pendiente.id, estado, comentario)

        if estado == "aprobado":
            indice_actual = SECUENCIA.index(paso)
            if indice_actual < len(SECUENCIA) - 1:
                siguiente_paso = SECUENCIA[indice_actual + 1]
                nuevo = NuevaAprobacion(solicitud_id=solicitud_id, paso=siguiente_paso, usuario=usuario)
                self.repository.crear_paso(nuevo)
                self.publisher.publicar("aprobacion.paso_completado",
                                         {"solicitud_id": solicitud_id, "paso": paso, "siguiente": siguiente_paso})
            else:
                # Último paso (authorizer) aprobado: el flujo terminó.
                self.publisher.actualizar_estado_solicitud(solicitud_id, "aprobada")
                self.publisher.publicar("solicitud.aprobada", {"solicitud_id": solicitud_id})
        elif estado == "rechazado":
            self.publisher.actualizar_estado_solicitud(solicitud_id, "rechazada")
            self.publisher.publicar("solicitud.rechazada", {"solicitud_id": solicitud_id, "paso": paso})

        return resuelto
