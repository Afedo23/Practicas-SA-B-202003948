from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.models import Aprobacion, NuevaAprobacion


class AprobacionRepositoryBase(ABC):
    """
    DIP: AprobacionService (capa de aplicación) depende de esta clase
    abstracta y no de SqlAlchemyAprobacionRepository directamente. La
    implementación concreta se decide en main.py al construir el
    servicio (composición de dependencias).

    ISP: expone solo las operaciones que el flujo maker-checker-authorizer
    necesita (crear un paso, listar por solicitud, resolver un paso
    pendiente), sin forzar métodos de administración genérica que un
    consumidor de este contrato no usaría.
    """

    @abstractmethod
    def crear_paso(self, data: NuevaAprobacion) -> Aprobacion: ...

    @abstractmethod
    def listar_por_solicitud(self, solicitud_id: int) -> List[Aprobacion]: ...

    @abstractmethod
    def obtener_pendiente(self, solicitud_id: int, paso: str) -> Optional[Aprobacion]: ...

    @abstractmethod
    def resolver_paso(self, aprobacion_id: int, estado: str, comentario: Optional[str]) -> Optional[Aprobacion]: ...
