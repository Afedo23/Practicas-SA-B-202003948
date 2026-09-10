# Práctica 7 — Integración y Despliegue Continuo (CI/CD)

**Curso:** Software Avanzado — FIUSAC, USAC
**Base:** reutiliza tal cual el sistema de microservicios `sa-platform` de la
[Práctica 5](../P5) (chart de Helm) desplegado en el clúster EKS creado en la
[Práctica 6](../P6).

Esta práctica no reescribe el sistema: le agrega automatización. El pipeline
vive en [`/.github/workflows/p7-cicd.yml`](../.github/workflows/p7-cicd.yml)
(los workflows de GitHub Actions **deben** estar en la raíz del repo, no
dentro de `/P7`, por eso el archivo real está un nivel arriba).

---

## 1. Qué hace el pipeline

El workflow `P7 - CI/CD sa-platform` tiene 4 jobs encadenados:

| # | Job | Cuándo corre | Qué hace |
|---|-----|---------------|----------|
| 1 | `test-node` | En cada push/PR que toque `P5/**` o `P7/**` | Matriz sobre los 5 servicios Node (`auth-service`, `solicitudes-service`, `api-gateway`, `cronjob1-registro`, `cronjob2-resumen`): `npm ci` → `npm run build` (compila TS) → `npm test`. |
| 2 | `test-python` | Igual que arriba | Matriz sobre los 2 servicios Python (`aprobaciones-service`, `notificaciones-service`): instala dependencias y corre `pytest`. |
| 3 | `docker-build-push` | Solo si 1 y 2 pasaron | Matriz sobre los **8** artefactos Docker (6 microservicios + 2 CronJobs + frontend). Construye cada imagen con `docker/build-push-action` y la publica en **GHCR** (`ghcr.io/<owner>/sa-p7/<servicio>`), taggeada con el SHA corto del commit y con `latest`. |
| 4 | `deploy` | Solo en `push` (nunca en Pull Request) | Configura credenciales AWS, actualiza el `kubeconfig` del clúster EKS de la Práctica 6, y corre `helm upgrade --install sa-platform` sobre el mismo namespace `sa-p6`, apuntando cada subchart a la imagen recién publicada (tag = SHA del commit). |

Es decir: **cada push a `main` construye, prueba, empaqueta y despliega
automáticamente** la plataforma completa sin intervención manual. Los Pull
Requests solo corren CI (jobs 1 y 2) — sirven de gate antes de fusionar,
pero nunca publican imágenes ni tocan el clúster.

### Disparadores (branches / tags)

```yaml
on:
  push:
    branches: [main]
    tags: ["p7-v*"]
    paths: ["P5/**", "P7/**", ".github/workflows/p7-cicd.yml"]
  pull_request:
    branches: [main]
    paths: ["P5/**", "P7/**"]
  workflow_dispatch: {}
```

- **`push` a `main`**: dispara CI completo + build/push de imágenes + deploy.
- **tag `p7-v*`** (ej. `p7-v1.0.0`): mismo flujo completo — útil para marcar
  una entrega calificable de forma explícita e inmutable.
- **`pull_request` contra `main`**: solo CI (jobs 1 y 2), para validar
  cambios antes de fusionar sin publicar ni desplegar nada.
- **`workflow_dispatch`**: permite re-ejecutar el pipeline manualmente desde
  la pestaña Actions.
- Los filtros `paths` evitan que el pipeline corra si el commit solo tocó,
  por ejemplo, la documentación de P6.

---

## 2. Registro de contenedores: GHCR

Se usa **GitHub Container Registry** (`ghcr.io`) en vez de DockerHub porque
no requiere crear ni versionar credenciales adicionales: el job de push usa
el `GITHUB_TOKEN` que Actions genera automáticamente para el propio
repositorio, con permiso `packages: write` declarado en el job.

**Paso manual único la primera vez:** por defecto los paquetes publicados en
GHCR quedan **privados**, y el clúster EKS necesitaría un
`imagePullSecret` para poder descargarlos. Para esta práctica, lo más simple
es entrar a *Settings → Packages* de cada paquete creado (`sa-p7/api-gateway`,
`sa-p7/auth-service`, etc., aparecen tras el primer push) y cambiar su
visibilidad a **Public**. Con eso el `Deployment` de Kubernetes puede hacer
`docker pull` sin credenciales adicionales.

---

## 3. Secrets requeridos en GitHub

`Settings → Secrets and variables → Actions → New repository secret`:

| Secret | Contenido |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credenciales del usuario IAM `sa-p6-student` creado en la Práctica 6 |
| `AWS_REGION` | `us-east-2` (o la región donde vive el clúster de P6) |
| `EKS_CLUSTER_NAME` | Nombre del clúster EKS de la Práctica 6 |
| `HELM_VALUES_LOCAL` | Contenido completo del `values.local.yaml` que ya usas en local (credenciales de Postgres/RabbitMQ/JWT/SMTP) — se pega tal cual, el pipeline lo reconstruye en el runner en tiempo de ejecución y nunca lo versiona |

`GITHUB_TOKEN` no se configura manualmente: GitHub lo inyecta solo.

---

## 4. Diagrama del pipeline

Ver [`docs/diagrama-pipeline.md`](docs/diagrama-pipeline.md) (Mermaid,
se renderiza directamente en GitHub).

---

## 5. Evidencia de ejecución

Ver [`evidencia/README.md`](evidencia/README.md) — ahí van las capturas de
pantalla de la ejecución exitosa en la pestaña Actions.

---

## 6. Preguntas teóricas

**¿Qué es CI/CD y qué problema resuelve?**
Integración Continua es la práctica de fusionar cambios pequeños y
frecuentes a una rama compartida, validándolos automáticamente (build +
pruebas) en cada push. Despliegue Continuo extiende eso hasta llevar
automáticamente el artefacto validado a un ambiente real. Resuelve el
problema de "funciona en mi máquina": sin CI/CD, la integración de cambios
de varias personas y el despliegue son eventos manuales, infrecuentes y
propensos a error humano; con CI/CD cada cambio se prueba y se puede liberar
de forma reproducible en minutos en vez de días.

**¿Por qué el build y el deploy están en jobs separados en vez de un solo
job largo?**
Porque tienen necesidades y fallos distintos: el build/test no necesita
credenciales de AWS ni acceso al clúster, y separar el job hace que un
Pull Request (que sí debe correr CI) nunca tenga la posibilidad de tocar el
clúster de producción. Además, con `needs:` el job de deploy no arranca si
las pruebas fallaron, y `docker-build-push` no publica imágenes rotas. Es
el mismo principio de responsabilidad única aplicado al pipeline: cada job
falla o pasa por una sola razón, lo que hace más fácil diagnosticar qué
etapa rompió.

**¿Por qué el tag de la imagen es el SHA del commit y no solo `latest`?**
`latest` es mutable: dos despliegues distintos pueden terminar corriendo
"la misma" imagen `latest` en momentos distintos, con contenido distinto,
lo que hace imposible saber con certeza qué código está corriendo en el
clúster o revertir a una versión específica. Taggear con el SHA corto del
commit (`${GITHUB_SHA::7}`) da trazabilidad 1:1 entre el estado del
repositorio y la imagen desplegada — `helm upgrade` con ese tag es
determinístico y reproducible. `latest` se sigue publicando en paralelo
solo como conveniencia para pruebas manuales rápidas, nunca es lo que
`helm upgrade` usa en el deploy automático.

**¿Qué pasa si un push a `main` rompe las pruebas?**
El job `test-node` o `test-python` falla, `docker-build-push` nunca arranca
(`needs: [test-node, test-python]`) y `deploy` tampoco. El clúster EKS sigue
corriendo la última imagen buena; no hay downtime ni versión rota
desplegada. El error queda visible en la pestaña Actions con el log exacto
de qué prueba falló.

**¿Por qué `deploy` corre solo en `push` y nunca en `pull_request`?**
Un Pull Request puede venir de una rama con cambios sin revisar (o incluso,
en repos públicos, de un fork). Si `deploy` corriera en PRs, cualquier
Pull Request abierto podría desplegar código no aprobado al clúster real y,
peor, requeriría exponerle los secrets de AWS/Helm a ese contexto. Por eso
el job de deploy usa `if: github.event_name == 'push'`: solo el código que
ya fue fusionado a `main` (o un tag) llega al clúster.
