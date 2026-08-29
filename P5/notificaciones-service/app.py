import threading

from flask import Flask, request, jsonify
from datetime import datetime

from consumer import run_consumer_forever

app = Flask(__name__)


class NotificacionStore:
    """
    SRP: única responsabilidad es guardar y exponer el historial de
    notificaciones recibidas. No sabe nada de solicitudes ni de
    aprobaciones; solo modela el concepto "notificación".
    """

    def __init__(self):
        self._notificaciones = []
        self._siguiente_id = 1

    def registrar(self, evento: str, payload: dict) -> dict:
        notificacion = {
            "id": self._siguiente_id,
            "evento": evento,
            "payload": payload,
            "fecha": datetime.utcnow().isoformat(),
        }
        self._notificaciones.append(notificacion)
        self._siguiente_id += 1
        return notificacion

    def listar(self):
        return list(reversed(self._notificaciones))


store = NotificacionStore()


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "notificaciones-service"})


@app.post("/notificaciones")
def crear_notificacion():
    data = request.get_json(force=True) or {}
    evento = data.get("evento")
    payload = data.get("payload", {})
    if not evento:
        return jsonify({"error": "evento es requerido"}), 400
    notificacion = store.registrar(evento, payload)
    return jsonify(notificacion), 201


@app.get("/notificaciones")
def listar_notificaciones():
    return jsonify(store.listar())


if __name__ == "__main__":
    # Hilo de fondo: consume del broker de forma independiente del ciclo
    # request/response HTTP de Flask.
    consumer_thread = threading.Thread(target=run_consumer_forever, daemon=True)
    consumer_thread.start()
    app.run(host="0.0.0.0", port=4004)
