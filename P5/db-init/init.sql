-- Crea una base de datos independiente para cada microservicio
CREATE DATABASE authdb;
CREATE DATABASE solicitudesdb;
CREATE DATABASE aprobacionesdb;
CREATE DATABASE auditoriadb;

\c authdb
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('maker', 'checker', 'authorizer', 'admin')),
    creado_en TIMESTAMP DEFAULT NOW()
);
-- Usuario admin de prueba (password: admin123, hash generado con bcrypt en el seed)
-- IMPORTANTE: reemplaza los correos de ejemplo por direcciones reales tuyas
-- (o de compañeros que puedan confirmar) antes de probar el envio de correo,
-- por ejemplo con:
--   UPDATE usuarios SET email = 'tu-correo-real@gmail.com' WHERE username = 'mgarcia';
INSERT INTO usuarios (username, email, password_hash, rol) VALUES
    ('mgarcia', 'mgarcia@example.com', '$2b$10$0iEvWAVxYZdoDK03Qq43COLntLguPap0DcM4m4tljs818jEEntA56', 'maker'),
    ('jchecker', 'jchecker@example.com', '$2b$10$e8io7jvvt1wnY5g2ElcvWOcw7wobFZ/pT/mToRSdd/NShd4QdE87u', 'checker'),
    ('lauthorizer', 'lauthorizer@example.com', '$2b$10$g4umvbWV2qDCZZY6GP5WQOOohzhNf3LaTulXege4cpo6jwg3oYe8.', 'authorizer')
ON CONFLICT DO NOTHING;

\c solicitudesdb
CREATE TABLE IF NOT EXISTS solicitudes (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    area_solicitante VARCHAR(80) NOT NULL,
    prioridad VARCHAR(20) NOT NULL CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
    costo_estimado NUMERIC(12,2) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'creada' CHECK (estado IN ('creada','en_revision','aprobada','rechazada')),
    creada_por VARCHAR(50) NOT NULL,
    creada_en TIMESTAMP DEFAULT NOW()
);

\c aprobacionesdb
CREATE TABLE IF NOT EXISTS aprobaciones (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL,
    paso VARCHAR(20) NOT NULL CHECK (paso IN ('maker','checker','authorizer')),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado')),
    usuario VARCHAR(50) NOT NULL,
    comentario VARCHAR(255),
    fecha TIMESTAMP DEFAULT NOW()
);

-- Codigos de confirmacion por correo, requeridos para resolver un paso de
-- checker/authorizer (ver aprobaciones-service/app/infrastructure/email_service.py).
-- Un codigo es de un solo uso y expira a los 10 minutos.
CREATE TABLE IF NOT EXISTS confirmaciones_pendientes (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL,
    paso VARCHAR(20) NOT NULL CHECK (paso IN ('checker','authorizer')),
    usuario VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    codigo VARCHAR(6) NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT false,
    expira_en TIMESTAMP NOT NULL,
    creado_en TIMESTAMP DEFAULT NOW()
);

\c auditoriadb
-- Cronjob 1 inserta aquí cada 2 minutos (fecha/hora GMT-6 + carné del estudiante)
CREATE TABLE IF NOT EXISTS cronjob_ejecuciones (
    id SERIAL PRIMARY KEY,
    fecha_hora TIMESTAMPTZ NOT NULL,
    carne VARCHAR(20) NOT NULL,
    creado_en TIMESTAMP DEFAULT NOW()
);

-- Cronjob 2 calcula el resumen y lo publica en el broker; el consumidor
-- (notificaciones-service) lo guarda aquí solo después de procesarlo (ack manual).
CREATE TABLE IF NOT EXISTS resumenes_cronjob (
    id SERIAL PRIMARY KEY,
    hora_bucket TIMESTAMPTZ NOT NULL,
    cantidad_ejecuciones INTEGER NOT NULL,
    carne VARCHAR(20) NOT NULL,
    publicado_en TIMESTAMPTZ NOT NULL,
    consumido_en TIMESTAMP DEFAULT NOW(),
    UNIQUE (hora_bucket, carne)
);
