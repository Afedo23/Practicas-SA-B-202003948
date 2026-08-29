import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime

DB_HOST = os.getenv("DB_HOST", "postgres-db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "sa_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "sa_password")
DB_NAME = os.getenv("DB_NAME", "aprobacionesdb")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class AprobacionORM(Base):
    __tablename__ = "aprobaciones"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, nullable=False)
    paso = Column(String(20), nullable=False)
    estado = Column(String(20), nullable=False, default="pendiente")
    usuario = Column(String(50), nullable=False)
    comentario = Column(String(255), nullable=True)
    fecha = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
