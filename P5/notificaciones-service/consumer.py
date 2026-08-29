"""
Practica 5 - Software Avanzado
Consumidor asincrono del broker (RabbitMQ). Se ejecuta en un hilo de fondo
dentro de notificaciones-service.

Flujo asincrono requerido (seccion D/H del enunciado):
  cronjob2-resumen (productor) -> cola durable "cronjobs.resumen" -> este
  consumidor, que guarda el resumen en auditoriadb.resumenes_cronjob y
  SOLO ENTONCES confirma (ack) el mensaje. Si este proceso esta caido, los
  mensajes se acumulan en la cola (es durable) y se procesan sin perdida
  cuando el consumidor vuelve a levantar.
"""
import json
import os
import time

import pika
import psycopg2

QUEUE_NAME = "cronjobs.resumen"


def _pg_connection():
    return psycopg2.connect(
        host=os.environ["DB_HOST"],
        port=os.environ.get("DB_PORT", "5432"),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        dbname=os.environ.get("DB_NAME", "auditoriadb"),
    )


def _guardar_resumen(mensaje: dict) -> None:
    conn = _pg_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO resumenes_cronjob
                        (hora_bucket, cantidad_ejecuciones, carne, publicado_en)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (hora_bucket, carne) DO UPDATE
                        SET cantidad_ejecuciones = EXCLUDED.cantidad_ejecuciones,
                            publicado_en = EXCLUDED.publicado_en,
                            consumido_en = NOW()
                    """,
                    (
                        mensaje["hora_bucket"],
                        mensaje["cantidad_ejecuciones"],
                        mensaje["carne"],
                        mensaje["publicado_en"],
                    ),
                )
    finally:
        conn.close()


def _on_message(channel, method, _properties, body):
    try:
        mensaje = json.loads(body)
        _guardar_resumen(mensaje)
        # Solo se confirma el mensaje despues de escribirlo correctamente en la BD.
        channel.basic_ack(delivery_tag=method.delivery_tag)
        print(f"[consumer] resumen guardado y confirmado: {mensaje}")
    except Exception as exc:  # noqa: BLE001
        print(f"[consumer] error procesando mensaje, se reencola: {exc}")
        # requeue=True: el mensaje NO se pierde, se procesara en un reintento.
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)


def _connect_with_retry(max_attempts: int = 30, delay_seconds: int = 5) -> pika.BlockingConnection:
    credentials = pika.PlainCredentials(
        os.environ["BROKER_USER"], os.environ["BROKER_PASSWORD"]
    )
    params = pika.ConnectionParameters(
        host=os.environ["BROKER_HOST"],
        port=int(os.environ.get("BROKER_PORT", 5672)),
        credentials=credentials,
        heartbeat=30,
    )
    last_error = None
    for attempt in range(1, max_attempts + 1):
        try:
            return pika.BlockingConnection(params)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            print(f"[consumer] intento {attempt}/{max_attempts} fallo al conectar al broker: {exc}")
            time.sleep(delay_seconds)
    raise last_error


def run_consumer_forever() -> None:
    while True:
        try:
            connection = _connect_with_retry()
            channel = connection.channel()
            # Cola durable + prefetch=1: procesa un mensaje a la vez y confirma
            # explicitamente (manual ack), nunca con auto-ack.
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=QUEUE_NAME, on_message_callback=_on_message)
            print("[consumer] escuchando cola 'cronjobs.resumen'...")
            channel.start_consuming()
        except Exception as exc:  # noqa: BLE001
            print(f"[consumer] conexion perdida, reintentando en 5s: {exc}")
            time.sleep(5)
