-- Crea una base de datos independiente para cada microservicio
CREATE DATABASE authdb;
CREATE DATABASE solicitudesdb;
CREATE DATABASE aprobacionesdb;

\c authdb
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('maker', 'checker', 'authorizer', 'admin')),
    creado_en TIMESTAMP DEFAULT NOW()
);
-- Usuario admin de prueba (password: admin123, hash generado con bcrypt en el seed)
INSERT INTO usuarios (username, password_hash, rol) VALUES
    ('mgarcia', '$2b$10$C6UzMDM.H6dfI/f/IKcEeOoLGb1e3H2lU2s2N.6d1ye1z8O1z8O1a', 'maker'),
    ('jchecker', '$2b$10$C6UzMDM.H6dfI/f/IKcEeOoLGb1e3H2lU2s2N.6d1ye1z8O1z8O1a', 'checker'),
    ('lauthorizer', '$2b$10$C6UzMDM.H6dfI/f/IKcEeOoLGb1e3H2lU2s2N.6d1ye1z8O1z8O1a', 'authorizer')
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
