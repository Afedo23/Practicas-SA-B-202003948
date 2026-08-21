# Diagrama Entidad-Relación

Cada microservicio tiene su propia base de datos (independencia de datos entre
servicios). No existen llaves foráneas físicas entre bases distintas; la relación
entre `solicitudes.id` y `aprobaciones.solicitud_id` es una **referencia lógica**
que cada servicio resuelve por API, no por JOIN de base de datos.

```mermaid
erDiagram
    USUARIOS {
        int id PK
        varchar username
        varchar password_hash
        varchar rol
        timestamp creado_en
    }

    SOLICITUDES {
        int id PK
        varchar titulo
        varchar area_solicitante
        varchar prioridad
        numeric costo_estimado
        varchar estado
        varchar creada_por
        timestamp creada_en
    }

    APROBACIONES {
        int id PK
        int solicitud_id "FK logica -> SOLICITUDES.id (otra BD)"
        varchar paso
        varchar estado
        varchar usuario
        varchar comentario
        timestamp fecha
    }

    SOLICITUDES ||--o{ APROBACIONES : "referencia logica (solicitud_id)"
```

**Bases de datos:**

| Base de datos      | Microservicio           | Tabla(s)     |
|---------------------|--------------------------|--------------|
| `authdb`            | auth-service             | `usuarios`   |
| `solicitudesdb`      | solicitudes-service       | `solicitudes`|
| `aprobacionesdb`     | aprobaciones-service      | `aprobaciones`|

`notificaciones-service` no persiste en base de datos relacional; mantiene el
historial de eventos en memoria durante la vida del contenedor.
