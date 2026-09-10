"""
Pruebas unitarias del dominio de aprobaciones-service.
No requieren base de datos ni red: solo validan las reglas de los
modelos pydantic (paso/estado validos) que usa la app.
"""
import pytest
from pydantic import ValidationError

from app.domain.models import (
    PASOS_VALIDOS,
    ESTADOS_VALIDOS,
    NuevaAprobacion,
    DecisionAprobacion,
)


def test_pasos_y_estados_validos_definidos():
    assert PASOS_VALIDOS == ("maker", "checker", "authorizer")
    assert ESTADOS_VALIDOS == ("pendiente", "aprobado", "rechazado")


def test_nueva_aprobacion_acepta_datos_correctos():
    aprobacion = NuevaAprobacion(
        solicitud_id=1, paso="checker", usuario="jchecker", comentario="ok"
    )
    assert aprobacion.solicitud_id == 1
    assert aprobacion.paso == "checker"
    assert aprobacion.comentario == "ok"


def test_nueva_aprobacion_comentario_es_opcional():
    aprobacion = NuevaAprobacion(solicitud_id=2, paso="maker", usuario="mgarcia")
    assert aprobacion.comentario is None


def test_nueva_aprobacion_falla_sin_campos_requeridos():
    with pytest.raises(ValidationError):
        NuevaAprobacion(paso="maker", usuario="mgarcia")


def test_decision_aprobacion_codigo_es_opcional_por_defecto():
    decision = DecisionAprobacion(estado="aprobado", usuario="lauthorizer")
    assert decision.codigo is None
