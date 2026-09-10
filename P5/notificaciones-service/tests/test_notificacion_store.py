"""
Pruebas unitarias de NotificacionStore (app.py). Es logica en memoria
pura: no abre conexiones a RabbitMQ ni a Postgres, por lo que se puede
probar sin variables de entorno ni servicios externos.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import NotificacionStore


def test_registrar_asigna_ids_incrementales():
    store = NotificacionStore()
    primera = store.registrar("solicitud.creada", {"id": 1})
    segunda = store.registrar("solicitud.aprobada", {"id": 1})

    assert primera["id"] == 1
    assert segunda["id"] == 2
    assert primera["evento"] == "solicitud.creada"


def test_listar_devuelve_las_notificaciones_mas_recientes_primero():
    store = NotificacionStore()
    store.registrar("evento.uno", {})
    store.registrar("evento.dos", {})

    listado = store.listar()

    assert len(listado) == 2
    assert listado[0]["evento"] == "evento.dos"
    assert listado[1]["evento"] == "evento.uno"
