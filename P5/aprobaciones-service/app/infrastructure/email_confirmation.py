"""
Practica 5/6 - Software Avanzado

Gate de confirmacion por correo: antes de resolver un paso de checker o
authorizer, el usuario debe pedir un codigo de un solo uso (se le envia
por correo real via Gmail SMTP) y enviarlo junto con su decision. Sin un
codigo valido y no vencido, la actualizacion del estado se rechaza.

SRP: este modulo solo sabe generar codigos, enviarlos por correo y
validarlos contra la tabla confirmaciones_pendientes. No sabe nada de la
regla de negocio del flujo maker/checker/authorizer -- eso vive en
AprobacionService.
"""
import os
import random
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText

from sqlalchemy import text
from sqlalchemy.orm import Session

CODIGO_VIGENCIA_MINUTOS = 10
PASOS_CON_CODIGO = ("checker", "authorizer")


def _smtp_config():
    return {
        "host": os.environ.get("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.environ.get("SMTP_PORT", 587)),
        "user": os.environ.get("SMTP_USER") or None,
        "password": os.environ.get("SMTP_PASS") or None,
        "enabled": os.environ.get("SMTP_ENABLED") == "true",
    }


def _enviar_correo(destinatario: str, asunto: str, cuerpo: str) -> None:
    cfg = _smtp_config()
    if not cfg["enabled"]:
        print("[email] SMTP_ENABLED=false, se omite el envio de correo")
        return
    msg = MIMEText(cuerpo)
    msg["Subject"] = asunto
    msg["From"] = cfg["user"] or "sistema-solicitudes@local.test"
    msg["To"] = destinatario
    try:
        with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
            # Mailpit (dev local) no ofrece STARTTLS ni pide credenciales;
            # Gmail real (prod) exige ambas cosas.
            if cfg["user"] and cfg["password"]:
                server.starttls()
                server.login(cfg["user"], cfg["password"])
            server.sendmail(msg["From"], [destinatario], msg.as_string())
        print(f"[email] codigo de confirmacion enviado a {destinatario}")
    except Exception as exc:  # noqa: BLE001
        # Un fallo de correo se reporta pero no debe tumbar la solicitud del
        # codigo en si -- el codigo ya quedo guardado y se puede reenviar.
        print(f"[email] error enviando codigo de confirmacion: {exc}")


def solicitar_codigo(db: Session, solicitud_id: int, paso: str, usuario: str, email: str) -> dict:
    if paso not in PASOS_CON_CODIGO:
        raise ValueError(f"El paso '{paso}' no requiere codigo de confirmacion")

    codigo = f"{random.randint(0, 999999):06d}"
    expira_en = datetime.utcnow() + timedelta(minutes=CODIGO_VIGENCIA_MINUTOS)

    db.execute(
        text(
            """
            INSERT INTO confirmaciones_pendientes
                (solicitud_id, paso, usuario, email, codigo, expira_en)
            VALUES (:solicitud_id, :paso, :usuario, :email, :codigo, :expira_en)
            """
        ),
        {
            "solicitud_id": solicitud_id,
            "paso": paso,
            "usuario": usuario,
            "email": email,
            "codigo": codigo,
            "expira_en": expira_en,
        },
    )
    db.commit()

    _enviar_correo(
        destinatario=email,
        asunto="Código de confirmación — Sistema de Solicitudes",
        cuerpo=(
            f"Hola {usuario},\n\n"
            f"Tu código para resolver el paso '{paso}' de la solicitud #{solicitud_id} es:\n\n"
            f"    {codigo}\n\n"
            f"Vence en {CODIGO_VIGENCIA_MINUTOS} minutos. Si no fuiste vos, ignorá este mensaje."
        ),
    )

    return {"solicitud_id": solicitud_id, "paso": paso, "expira_en": expira_en.isoformat()}


def validar_codigo(db: Session, solicitud_id: int, paso: str, usuario: str, codigo: str) -> bool:
    """
    Valida y CONSUME (marca como usado) el codigo mas reciente que coincida.
    Devuelve True solo si habia un codigo vigente, no usado, y coincidente.
    """
    row = db.execute(
        text(
            """
            SELECT id FROM confirmaciones_pendientes
            WHERE solicitud_id = :solicitud_id
              AND paso = :paso
              AND usuario = :usuario
              AND codigo = :codigo
              AND usado = false
              AND expira_en > NOW()
            ORDER BY id DESC
            LIMIT 1
            """
        ),
        {"solicitud_id": solicitud_id, "paso": paso, "usuario": usuario, "codigo": codigo},
    ).fetchone()

    if not row:
        return False

    db.execute(
        text("UPDATE confirmaciones_pendientes SET usado = true WHERE id = :id"),
        {"id": row[0]},
    )
    db.commit()
    return True
