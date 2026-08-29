from pydantic import BaseModel
from typing import Optional
from datetime import datetime

PASOS_VALIDOS = ("maker", "checker", "authorizer")
ESTADOS_VALIDOS = ("pendiente", "aprobado", "rechazado")


class NuevaAprobacion(BaseModel):
    solicitud_id: int
    paso: str
    usuario: str
    comentario: Optional[str] = None


class DecisionAprobacion(BaseModel):
    estado: str  # "aprobado" | "rechazado"
    usuario: str
    comentario: Optional[str] = None


class Aprobacion(BaseModel):
    id: int
    solicitud_id: int
    paso: str
    estado: str
    usuario: str
    comentario: Optional[str] = None
    fecha: datetime

    class Config:
        from_attributes = True
