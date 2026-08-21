# Diagrama de Despliegue

Todos los servicios corren como contenedores Docker independientes, orquestados
por `docker-compose.yml`, dentro de una misma red Docker (`sa-p4-network`, creada
implícitamente por Compose).

```mermaid
flowchart TB
    subgraph Host["Docker Host"]
        subgraph Net["Red Docker: p4_default"]
            GW["Contenedor: api-gateway\nNode.js 20 :8080"]
            AU["Contenedor: auth-service\nNode.js 20 :4001"]
            SO["Contenedor: solicitudes-service\nNode.js 20 :4002"]
            AP["Contenedor: aprobaciones-service\nPython 3.12 :4003"]
            NO["Contenedor: notificaciones-service\nPython 3.12 :4004"]
            PG["Contenedor: postgres-db\nPostgreSQL 16 :5432\n(authdb, solicitudesdb, aprobacionesdb)"]
            VOL[("Volumen: sa_p4_pgdata")]
        end
    end

    Cliente["Cliente externo\n(navegador / Postman)"] -->|":8080"| GW
    GW --> AU
    GW --> SO
    GW --> AP
    GW --> NO
    AU --> PG
    SO --> PG
    AP --> PG
    SO -.->|HTTP evento| NO
    PG --- VOL
```

**Comando único de despliegue:**

```bash
docker compose up --build
```

Esto construye las 5 imágenes (gateway + 4 microservicios), levanta Postgres,
ejecuta el script `db-init/init.sql` para crear las 3 bases de datos y sus
tablas, y expone el sistema completo en `http://localhost:8080`.
