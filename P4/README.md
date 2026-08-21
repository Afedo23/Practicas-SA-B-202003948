# Práctica 4 — Diseño y toma de decisiones
### Software Avanzado · FIUSAC · Segundo Semestre 2026

Sistema de **solicitudes operativas** con flujo de aprobación **maker-checker-authorizer**,
construido como arquitectura de microservicios. Continúa y da vida al diseño planteado en
la Práctica 3 y al servicio de autenticación de la Práctica 2.

## Microservicios

| Servicio | Lenguaje | Puerto | Protocolo | Responsabilidad |
|---|---|---|---|---|
| `auth-service` | Node.js + TypeScript | 4001 | REST + GraphQL | Login, JWT, perfil de usuario |
| `solicitudes-service` | Node.js + TypeScript | 4002 | REST + GraphQL | CRUD de solicitudes operativas |
| `aprobaciones-service` | Python + FastAPI | 4003 | REST | Flujo maker → checker → authorizer |
| `notificaciones-service` | Python + Flask | 4004 | REST | Registro de eventos del sistema |
| `api-gateway` | Node.js + Express | 8080 | REST + GraphQL | Punto único de entrada |

Se cumplen los requisitos de la práctica: 4 microservicios mínimo, 2 lenguajes distintos
(Node.js y Python), GraphQL en 2 servicios (`auth-service` y `solicitudes-service`),
Dockerfile individual por servicio, `docker-compose.yml` único, e integración del
servicio de autenticación de la Práctica 2.

## Cómo levantar el sistema

```bash
docker compose up --build
```

Esto construye e inicia los 5 contenedores + PostgreSQL, y crea automáticamente
las 3 bases de datos (`authdb`, `solicitudesdb`, `aprobacionesdb`) vía
`db-init/init.sql`. El sistema completo queda disponible en `http://localhost:8080`.

Usuarios de prueba (contraseña `admin123` para los tres):

| username | rol |
|---|---|
| `mgarcia` | maker |
| `jchecker` | checker |
| `lauthorizer` | authorizer |

> Nota: el hash de ejemplo en `db-init/init.sql` es ilustrativo; para un login
> real, regenera el hash con bcrypt para la contraseña que quieras usar.

## Endpoints principales (vía Gateway)

- `POST /api/auth/login` — autenticación, devuelve JWT
- `GET  /api/auth/me` — perfil del usuario autenticado
- `GET/POST/PATCH/DELETE /api/solicitudes/solicitudes` — CRUD de solicitudes
- `POST /api/aprobaciones/{solicitud_id}/iniciar` — inicia el flujo de aprobación
- `PATCH /api/aprobaciones/{solicitud_id}/{paso}` — resuelve un paso (maker/checker/authorizer)
- `GET /api/notificaciones/notificaciones` — historial de eventos
- `POST /graphql/auth` y `POST /graphql/solicitudes` — GraphQL

El contrato completo está documentado en [`docs/postman_collection.json`](docs/postman_collection.json)
(importable directamente en Postman).

## Documentación técnica

- [Diagrama de arquitectura](docs/diagrama-arquitectura.md)
- [Diagrama de despliegue](docs/diagrama-despliegue.md)
- [Diagrama ER](docs/diagrama-er.md)
- [Explicación de los principios SOLID aplicados](README-SOLID.md)

## Estructura del repositorio

```
P4/
├── api-gateway/
├── auth-service/
├── solicitudes-service/
├── aprobaciones-service/
├── notificaciones-service/
├── db-init/init.sql
├── docs/
├── docker-compose.yml
├── README.md
└── README-SOLID.md
```
