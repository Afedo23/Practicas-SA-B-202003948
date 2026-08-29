from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from app.infrastructure.db import Base, engine, get_db
from app.infrastructure.sqlalchemy_repository import SqlAlchemyAprobacionRepository
from app.infrastructure.http_event_publisher import HttpEventPublisher
from app.infrastructure import email_confirmation
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


@app.post("/{solicitud_id}/{paso}/solicitar-codigo", status_code=201)
def solicitar_codigo(solicitud_id: int, paso: str, usuario: str, email: str,
                      db: Session = Depends(get_db)):
    """
    Genera un codigo de confirmacion de un solo uso y lo envia por correo
    real (Gmail SMTP) al 'email' indicado. Requerido antes de poder
    resolver un paso de checker o authorizer con PATCH /{id}/{paso}.
    """
    if paso not in email_confirmation.PASOS_CON_CODIGO:
        raise HTTPException(status_code=400, detail="Este paso no requiere código de confirmación")
    return email_confirmation.solicitar_codigo(db, solicitud_id, paso, usuario, email)


@app.patch("/{solicitud_id}/{paso}")
def resolver_paso(solicitud_id: int, paso: str, decision: DecisionAprobacion,
                   db: Session = Depends(get_db),
                   service: AprobacionService = Depends(get_service)):
    if paso not in ("maker", "checker", "authorizer"):
        raise HTTPException(status_code=400, detail="Paso inválido")
    if decision.estado not in ("aprobado", "rechazado"):
        raise HTTPException(status_code=400, detail="Estado inválido")

    if paso in email_confirmation.PASOS_CON_CODIGO:
        if not decision.codigo:
            raise HTTPException(
                status_code=401,
                detail="Este paso requiere 'codigo' de confirmación (pedilo con POST /{id}/{paso}/solicitar-codigo)",
            )
        valido = email_confirmation.validar_codigo(db, solicitud_id, paso, decision.usuario, decision.codigo)
        if not valido:
            raise HTTPException(status_code=401, detail="Código de confirmación inválido, vencido o ya usado")

    resultado = service.resolver(solicitud_id, paso, decision.estado, decision.usuario, decision.comentario)
    if not resultado:
        raise HTTPException(status_code=404, detail="No hay un paso pendiente para ese solicitud/paso")
    return resultado