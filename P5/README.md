# Práctica 5 — Orquestación avanzada de microservicios en Kubernetes con Helm

Construida sobre los 5 servicios de la Práctica 4 (`auth-service`,
`solicitudes-service`, `aprobaciones-service`, `notificaciones-service`,
`api-gateway`), empaquetados como un chart de Helm único (`sa-platform`)
con PostgreSQL y RabbitMQ como dependencias, más 2 CronJobs nuevos.

**Documentación completa (arquitectura, comandos reproducibles, evidencias
requeridas, preguntas teóricas): [`docs/README.md`](docs/README.md).**

## Estructura

```
P5/
├── frontend/                # NUEVO: panel de pruebas estatico (HTML/JS + nginx)
├── auth-service/            # Node/TS - hereda de P4, Dockerfile multi-stage
├── solicitudes-service/     # Node/TS - hereda de P4, Dockerfile multi-stage
├── aprobaciones-service/    # Python/FastAPI - hereda de P4, Dockerfile multi-stage
├── notificaciones-service/  # Python/Flask - hereda de P4 + consumidor RabbitMQ nuevo
├── api-gateway/             # Node/Express - hereda de P4, Dockerfile multi-stage
├── cronjobs/
│   ├── cronjob1-registro/   # inserta ejecucion cada 2 min
│   └── cronjob2-resumen/    # resume y publica al broker cada 10 min
├── charts/sa-platform/      # chart padre con subcharts + dependencias
│   ├── Chart.yaml
│   ├── values.yaml / values-dev.yaml / values-prod.yaml / values.example.yaml
│   ├── templates/           # namespace, quota, limitrange, secret, configmap,
│   │                        # ingress, networkpolicies, _helpers.tpl
│   └── charts/               # subcharts: api-gateway, auth-service,
│                              # solicitudes-service, aprobaciones-service,
│                              # notificaciones-service, cronjobs
├── db-init/init.sql         # esquema (tambien embebido en values.yaml para bitnami/postgresql)
├── scripts/load-test.js     # prueba de carga con k6
└── docs/README.md           # documentacion completa + evidencias
```

## Antes de instalar

1. `cd charts/sa-platform && helm dependency update` (descarga postgresql y
   rabbitmq de bitnami).
2. Copiar `values.example.yaml` a `values.local.yaml` y poner tu carné en
   `global.estudianteCarne`.
3. Construir y publicar las 8 imágenes (5 servicios + 1 frontend + 2 cronjobs) en el
   registry que uses (o cargarlas directo al clúster local con
   `minikube image load` / `eval $(minikube docker-env)`).
4. Seguir los comandos reproducibles completos en `docs/README.md`.

## Nota sobre el uso de IA

Este scaffold (estructura del chart de Helm, manifiestos de Kubernetes,
Dockerfiles multi-stage, cronjobs y consumidor de RabbitMQ) fue generado
con asistencia de IA a partir del código de la Práctica 4, tal como exige
declarar el marco formativo de esta práctica. **Antes de entregar**: revisá
cada archivo, ejecutá el chart en tu propio clúster, completá las
evidencias reales en `docs/README.md` y respondé las preguntas teóricas
con tus propias palabras si vas a modificarlas.
