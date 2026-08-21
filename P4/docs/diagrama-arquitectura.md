# Diagrama de Arquitectura

Comunicación entre servicios: todo el tráfico externo entra por el **API Gateway**,
que enruta hacia cada microservicio. Ningún microservicio llama directamente a otro,
excepto `solicitudes-service`, que publica eventos hacia `notificaciones-service`
(comunicación asíncrona de notificación, no de consulta).

```mermaid
flowchart LR
    Cliente["Cliente / Postman / Frontend"]

    subgraph Gateway["API Gateway (Node.js) :8080"]
        GW[/"/api/*  y  /graphql/*"/]
    end

    subgraph Auth["auth-service (Node.js + TS)\nREST + GraphQL :4001"]
        A1[Login / JWT]
        A2[Consulta de perfil]
    end

    subgraph Solicitudes["solicitudes-service (Node.js + TS)\nREST + GraphQL :4002"]
        S1[CRUD solicitudes operativas]
    end

    subgraph Aprobaciones["aprobaciones-service (Python/FastAPI)\nREST :4003"]
        AP1[Flujo maker-checker-authorizer]
    end

    subgraph Notificaciones["notificaciones-service (Python/Flask)\nREST :4004"]
        N1[Registro de eventos]
    end

    DB[(PostgreSQL\nauthdb / solicitudesdb / aprobacionesdb)]

    Cliente --> GW
    GW --> A1
    GW --> A2
    GW --> S1
    GW --> AP1
    GW --> N1

    A1 --> DB
    A2 --> DB
    S1 --> DB
    AP1 --> DB

    S1 -. "evento: solicitud.creada / solicitud.estado_cambiado" .-> N1
```

**Notas:**
- El Gateway es el único punto de entrada (patrón *API Gateway*), evitando que el
  cliente conozca las direcciones internas de cada microservicio.
- `auth-service` y `solicitudes-service` exponen tanto REST como GraphQL.
- `solicitudes-service` → `notificaciones-service` es la única comunicación
  directa entre microservicios (fuera del Gateway), usada solo para notificar
  eventos de forma asíncrona (fire-and-forget), no para leer datos.
