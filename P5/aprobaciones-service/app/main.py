from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from app.infrastructure.db import Base, engine, get_db
from app.infrastructure.sqlalchemy_repository import SqlAlchemyAprobacionRepository
from app.infrastructure.http_event_publisher import HttpEventPublisher
from app.services.aprobacion_service import AprobacionService
from app.domain.models import DecisionAprobacion

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Aprobaciones Service", version="1.0.0")


def get_service(db: Session = Depends(get_db)) -> AprobacionService:
    # Composición de dependencias (DIP): se inyecta la implementación
    # concreta del repositorio y del publisher de eventos dentro de las
    # abstracciones esperadas por AprobacionService.
    repository = SqlAlchemyAprobacionRepository(db)
    publisher = HttpEventPublisher()
    return AprobacionService(repository, publisher)


@app.get("/health")
def health():
    return {"status": "ok", "service": "aprobaciones-service"}


@app.post("/{solicitud_id}/iniciar", status_code=201)
def iniciar_flujo(solicitud_id: int, usuario: str, comentario: str | None = None,
                   service: AprobacionService = Depends(get_service)):
    return service.iniciar_flujo(solicitud_id, usuario, comentario)


@app.get("/{solicitud_id}/historial")
def historial(solicitud_id: int, service: AprobacionService = Depends(get_service)):
    return service.historial(solicitud_id)


@app.patch("/{solicitud_id}/{paso}")
def resolver_paso(solicitud_id: int, paso: str, decision: DecisionAprobacion,
                   service: AprobacionService = Depends(get_service)):
    if paso not in ("maker", "checker", "authorizer"):
        raise HTTPException(status_code=400, detail="Paso inválido")
    if decision.estado not in ("aprobado", "rechazado"):
        raise HTTPException(status_code=400, detail="Estado inválido")

    resultado = service.resolver(solicitud_id, paso, decision.estado, decision.usuario, decision.comentario)
    if not resultado:
        raise HTTPException(status_code=404, detail="No hay un paso pendiente para ese solicitud/paso")
    return resultado