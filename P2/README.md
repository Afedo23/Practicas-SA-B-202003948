# P2 — Módulo de registro y login (Software Avanzado)

Implementación del módulo de autenticación/autorización con roles **Admin** y
**Cliente**, según el enunciado de la Práctica 2.

## Arquitectura

```
P2/
├─ auth-service/           # Backend principal (NestJS + Prisma + PostgreSQL)
│  └─ Registro, login, JWT en cookies HTTP-only, cifrado AES de datos sensibles
├─ authorization-service/  # Microservicio independiente de autorización (Express)
│  └─ Recibe {token, route} y responde {allowed: boolean}
├─ frontend/                # HTML/CSS/JS estático: login, registro y página de confirmación
└─ PROMPTS.md               # Prompts de IA usados durante el desarrollo y su análisis
```

`auth-service` es la única pieza que habla con el frontend y con la base de
datos. Para decidir si un usuario puede entrar a una ruta protegida, **no**
decide el rol localmente: le pregunta a `authorization-service`, que es un
proceso aparte, con su propio `package.json` y su propio puerto.

## Cómo cada requerimiento del enunciado está cubierto

1. **API REST** — `auth-service` expone `/auth/*` y `/protected/*` como API REST consumida por el frontend vía `fetch`.
2. **JWT** — `@nestjs/jwt` firma access y refresh tokens por separado (`src/auth/auth.service.ts`).
3. **Token no visible** — ambos tokens viajan solo en cookies `httpOnly` (`src/auth/cookie.util.ts`); el frontend nunca los lee ni los guarda en `localStorage`.
4. **TTL configurable** — `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` en `.env` (ver `AppConfigService`).
5. **Renovación automática dentro de una ventana de gracia** — `JwtCookieAuthGuard` (`src/auth/guards/jwt-cookie-auth.guard.ts`): si el access token expiró pero han pasado menos de `JWT_RENEWAL_GRACE_SECONDS` segundos, usa el refresh token (cookie) para emitir uno nuevo de forma transparente, sin pedir login otra vez. Fuera de esa ventana, exige login.
6. **Datos sensibles cifrados** — `AesService` (`src/crypto/aes.service.ts`) cifra `nombre` y `correo` con **AES-256-GCM** antes de guardarlos. La contraseña se guarda con **bcrypt** (hash de una vía) en vez de AES: un cifrado reversible de contraseñas sería inseguro, ya que cualquiera con la clave podría recuperarlas en texto plano; bcrypt es la práctica estándar para credenciales. Esta decisión se documenta también como comentario en `prisma/schema.prisma`.
7. **Página de confirmación** — `frontend/dashboard.html`, a la que se redirige tras un login exitoso; consulta `GET /auth/me` y muestra los datos del usuario.
8. **Dos endpoints protegidos por rol** — `GET /protected/route1` (solo Admin) y `GET /protected/route2` (Admin y Cliente) en `src/protected/protected.controller.ts`.
9. **Microservicio de autorización desacoplado + retry/backoff** — `authorization-service` es un proceso Express independiente que verifica la firma del JWT y consulta una tabla de permisos por ruta (`src/permissions.ts`). `auth-service` lo consulta desde `AuthorizationClientService` (`src/authorization-client/authorization-client.service.ts`) con un ciclo de reintentos con backoff exponencial (`AUTHORIZATION_RETRY_MAX_ATTEMPTS`, `AUTHORIZATION_RETRY_BASE_DELAY_MS`) antes de denegar el acceso por error de comunicación.

## Puesta en marcha

Este proyecto usa **PostgreSQL en Neon** (base de datos en la nube), así que
no hace falta levantar nada localmente para la base de datos — solo pegar tu
cadena de conexión de Neon en `auth-service/.env`.

### 1. authorization-service (microservicio de autorización)

```powershell
cd authorization-service
copy .env.example .env   # usar el MISMO JWT_ACCESS_SECRET que en auth-service
npm install
npm run start:dev
```

### 2. auth-service (backend principal)

```powershell
cd auth-service
copy .env.example .env
```

En `auth-service\.env`, edita:

- `DATABASE_URL` → tu cadena de conexión de Neon (termina en `?sslmode=require`).
- `AES_ENCRYPTION_KEY` → generar con:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `EMAIL_HASH_SECRET` → cualquier string largo y aleatorio.

```powershell
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

### 3. Frontend

```powershell
cd frontend
npx http-server -p 5173
# abrir http://localhost:5173  (usar localhost, no la IP de red — ver CORS abajo)
```

## Notas de seguridad relevantes para la práctica

- El **access token** solo lleva `sub` (id de usuario) y `role`; nunca datos personales, para minimizar exposición si el JWT se inspeccionara.
- El **refresh token** es de un tipo distinto (`type: "refresh"`) y solo sirve para pedir un nuevo access token, nunca para acceder directamente a rutas protegidas.
- `AuthorizationClientService` distingue entre "el microservicio respondió que no" (deniega directo) y "no hubo respuesta / timeout" (reintenta con backoff); solo tras agotar los reintentos se deniega por error de comunicación (fail-closed).
- El `id` de usuario es un UUID (no autoincremental) a propósito: con IDs secuenciales cualquiera puede enumerar cuántos usuarios existen o adivinar IDs de otras cuentas probando números consecutivos.

## Notas de configuración

- `FRONTEND_ORIGIN` en `auth-service\.env` debe coincidir exactamente con el origen desde el que abres el frontend (por CORS con cookies). Si abres `http://localhost:5173`, déjalo así; si usas otra IP/host, cámbialo ahí y reinicia `auth-service`.
