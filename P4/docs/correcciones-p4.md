# Correcciones aplicadas — Práctica 4 (Sistema de Solicitudes)

Este documento resume los problemas encontrados al probar el sistema de punta a punta
y las correcciones aplicadas, en el orden en que se descubrieron.

## 1. Hash bcrypt de prueba inválido en el seed

**Problema:** el login devolvía `401 Credenciales inválidas` para los 3 usuarios de
prueba (`mgarcia`, `jchecker`, `lauthorizer`), aunque la contraseña usada era la
correcta (`admin123`). El hash bcrypt cargado en `db-init/init.sql` era un valor
ilustrativo, no un hash real de esa contraseña.

**Corrección:** se generó un hash bcrypt real de `admin123` y se actualizó
directamente en la base de datos:

```sql
UPDATE usuarios SET password_hash = '$2b$10$cDhcx2zNRwPSZDmPEyMN8Ohw8sGKHjCR6fLP.hMrLiUeKV8x2H6ZK'
WHERE username IN ('mgarcia', 'jchecker', 'lauthorizer');
```

> Para que quede persistente en `db-init/init.sql` (y no se pierda si se reinicia el
> volumen de Postgres), reemplazar ahí también el hash de ejemplo por este valor real.

## 2. Enrutamiento roto para `/api/aprobaciones/*`

**Problema:** `POST /api/aprobaciones/{id}/iniciar`, `GET /historial` y
`PATCH /{paso}` devolvían `404 Not Found` a través del gateway, aunque
`/api/aprobaciones/health` sí respondía bien.

**Causa raíz:** en Express, cuando se monta un middleware con
`app.use("/api/aprobaciones", proxy)`, Express recorta automáticamente el prefijo
`/api/aprobaciones` del `req.url` **antes** de que `http-proxy-middleware` reciba la
petición. Por eso el `pathRewrite: {"^/api/aprobaciones": "/aprobaciones"}` nunca
encontraba coincidencia — ya no quedaba nada que reescribir. El `/health` funcionaba
por una coincidencia: como esa ruta en `aprobaciones-service` no tenía prefijo
(`@app.get("/health")`), el `req.url` recortado (`/health`) ya coincidía sin ayuda del
`pathRewrite`. Las demás rutas del servicio sí tenían el prefijo `/aprobaciones/...`,
que se perdía en el recorte.

**Corrección:** se quitó el prefijo `/aprobaciones` de las rutas internas de
`aprobaciones-service` (`app/main.py`), dejándolas consistentes con `/health`:

| Antes | Ahora |
|---|---|
| `@app.post("/aprobaciones/{solicitud_id}/iniciar")` | `@app.post("/{solicitud_id}/iniciar")` |
| `@app.get("/aprobaciones/{solicitud_id}/historial")` | `@app.get("/{solicitud_id}/historial")` |
| `@app.patch("/aprobaciones/{solicitud_id}/{paso}")` | `@app.patch("/{solicitud_id}/{paso}")` |

Archivo modificado: `aprobaciones-service/app/main.py`.

## 3. Falta de integración entre `aprobaciones-service` y el resto del sistema

**Problema:** al completar el flujo maker → checker → authorizer (paso `authorizer`
aprobado), la solicitud correspondiente se quedaba con `estado: "creada"` en
`solicitudes-service`, y no se generaba ninguna notificación del flujo de aprobación
en `notificaciones-service` (solo la de creación). `aprobacion_service.py` solo
escribía en su propia base de datos (`aprobacionesdb`) y nunca llamaba a los otros
servicios.

**Corrección:** se agregó una abstracción `EventPublisherBase` (principio DIP, mismo
patrón que ya usaba `solicitudes-service` con `IEventPublisher`) y su implementación
HTTP, inyectadas en `AprobacionService`:

- **Nuevo:** `aprobaciones-service/app/domain/event_publisher.py` — interfaz abstracta
  con `publicar(evento, payload)` y `actualizar_estado_solicitud(solicitud_id, estado)`.
- **Nuevo:** `aprobaciones-service/app/infrastructure/http_event_publisher.py` —
  implementación con `requests` (ya estaba en `requirements.txt`, no se agregaron
  dependencias) hacia `solicitudes-service` y `notificaciones-service`.
- **Modificado:** `aprobaciones-service/app/services/aprobacion_service.py` — el
  método `resolver()` ahora:
  - Al aprobar el paso `authorizer` (último de la secuencia): llama a
    `PATCH /solicitudes/{id}/estado` con `"aprobada"` y publica el evento
    `solicitud.aprobada`.
  - Al rechazar cualquier paso: llama al mismo endpoint con `"rechazada"` y publica
    `solicitud.rechazada`.
  - Al aprobar un paso intermedio (`maker` o `checker`): publica
    `aprobacion.paso_completado` además de crear el siguiente paso pendiente (como ya
    hacía antes).
- **Modificado:** `aprobaciones-service/app/main.py` — se inyecta `HttpEventPublisher`
  en `get_service()`.

Un fallo al notificar no interrumpe la resolución del paso (mismo criterio que ya
usaba `HttpNotificacionesPublisher` en `solicitudes-service`): se captura la excepción
y solo se imprime un mensaje de advertencia.

## 4. Enrutamiento roto para `/graphql/auth` y `/graphql/solicitudes`

**Problema:** ambos endpoints GraphQL devolvían `Cannot POST /` a través del gateway.

**Causa raíz:** el mismo problema del punto 2, pero aquí no se podía "arreglar"
quitando un prefijo en el servicio de destino, porque Apollo Server siempre expone
GraphQL en la ruta fija `/graphql` (convención estándar, no debía cambiarse).

**Corrección:** en vez de depender de un `pathRewrite` basado en regex (que nunca
coincide, por la razón explicada en el punto 2), se usó una función que fuerza
siempre el mismo destino, ya que estos dos proxies solo sirven un único endpoint:

```javascript
// Antes (nunca coincidía):
pathRewrite: { "^/graphql/auth": "/graphql" }

// Ahora:
pathRewrite: () => "/graphql"
```

Aplicado igual para `/graphql/solicitudes`. Archivo modificado:
`api-gateway/src/index.js`.

## Resumen de archivos modificados

| Archivo | Cambio |
|---|---|
| `db-init/init.sql` / BD `authdb` | Hash bcrypt real para `admin123` |
| `aprobaciones-service/app/main.py` | Rutas sin prefijo duplicado `/aprobaciones`; inyecta `HttpEventPublisher` |
| `aprobaciones-service/app/domain/event_publisher.py` | **Nuevo** — interfaz `EventPublisherBase` |
| `aprobaciones-service/app/infrastructure/http_event_publisher.py` | **Nuevo** — implementación HTTP del publisher |
| `aprobaciones-service/app/services/aprobacion_service.py` | Notifica y actualiza estado al aprobar/rechazar |
| `api-gateway/src/index.js` | `pathRewrite` de `/graphql/auth` y `/graphql/solicitudes` como función fija |

## Evidencia de pruebas end-to-end (22/08/2026)

Todo lo siguiente se probó exitosamente vía PowerShell (`Invoke-RestMethod`) contra
`http://localhost:8080`:

- **Login REST y GraphQL** con `mgarcia` / `admin123` → JWT válido.
- **`/me` REST y GraphQL** con el token → perfil correcto.
- **CRUD de solicitudes** (crear, listar, obtener por id) vía REST y GraphQL.
- **Flujo maker → checker → authorizer aprobado completo** (solicitud #2:
  *Compra de laptops*) → `estado: "aprobada"` propagado automáticamente a
  `solicitudes-service`.
- **Flujo con rechazo** (solicitud #3: *Viaje de capacitación*, rechazada en el paso
  `checker`) → `estado: "rechazada"` propagado automáticamente.
- **Notificaciones** registrando la cadena completa de eventos: `solicitud.creada`,
  `aprobacion.paso_completado` (x2), `solicitud.estado_cambiado`,
  `solicitud.aprobada` / `solicitud.rechazada`.

## Nota sobre el patrón general del bug de enrutamiento

Los puntos 2 y 4 comparten la misma causa raíz: Express recorta el prefijo de montaje
del `req.url` antes de invocar el middleware de proxy, por lo que cualquier
`pathRewrite` en `api-gateway/src/index.js` que intente volver a hacer *match* sobre
ese mismo prefijo (`^/api/aprobaciones`, `^/graphql/auth`, etc.) nunca coincide. Las
rutas de `/api/auth` y `/api/solicitudes` "funcionaban" únicamente por coincidencia de
nombres, no porque el `pathRewrite` estuviera actuando correctamente. Vale la pena
mencionar esto si se pregunta por qué solo algunas rutas fallaban al principio.
