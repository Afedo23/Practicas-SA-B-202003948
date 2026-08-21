from typing import List, Optional
from sqlalchemy.orm import Session
from app.domain.repository import AprobacionRepositoryBase
from app.domain.models import Aprobacion, NuevaAprobacion
from app.infrastructure.db import AprobacionORM


class SqlAlchemyAprobacionRepository(AprobacionRepositoryBase):
    """
    SRP: única responsabilidad es traducir entre el modelo de dominio
    Aprobacion y las filas de la tabla `aprobaciones` en Postgres.
    """

    def __init__(self, db: Session):
        self.db = db

    def _to_domain(self, row: AprobacionORM) -> Aprobacion:
        return Aprobacion.model_validate(row)

    def crear_paso(self, data: NuevaAprobacion) -> Aprobacion:
        row = AprobacionORM(
            solicitud_id=data.solicitud_id,
            paso=data.paso,
            usuario=data.usuario,
            comentario=data.comentario,
            estado="pendiente",
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return self._to_domain(row)

    def listar_por_solicitud(self, solicitud_id: int) -> List[Aprobacion]:
        rows = (
            self.db.query(AprobacionORM)
            .filter(AprobacionORM.solicitud_id == solicitud_id)
            .order_by(AprobacionORM.id)
            .all()
        )
        return [self._to_domain(r) for r in rows]

    def obtener_pendiente(self, solicitud_id: int, paso: str) -> Optional[Aprobacion]:
        row = (
            self.db.query(AprobacionORM)
            .filter(
                AprobacionORM.solicitud_id == solicitud_id,
                AprobacionORM.paso == paso,
                AprobacionORM.estado == "pendiente",
            )
            .first()
        )
        return self._to_domain(row) if row else None

    def resolver_paso(self, aprobacion_id: int, estado: str, comentario: Optional[str]) -> Optional[Aprobacion]:
        row = self.db.query(AprobacionORM).filter(AprobacionORM.id == aprobacion_id).first()
        if not row:
            return None
        row.estado = estado
        if comentario:
            row.comentario = comentario
        self.db.commit()
        self.db.refresh(row)
        return self._to_domain(row)
