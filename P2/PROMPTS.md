# PROMPTS.md — Uso de IA en la Práctica 2

Este archivo documenta los prompts usados con IA (Claude) para construir y
depurar el módulo de registro/login de esta práctica, junto con un análisis
de qué tan útil fue cada respuesta y qué se tuvo que ajustar.

---

## Prompt 1 — Generación inicial del proyecto

**Prompt:**
> Se pegó el enunciado completo de la Práctica 2 (registro/login con JWT en
> cookies HTTP-only, roles Admin/Cliente, dos rutas protegidas, cifrado AES
> de datos sensibles, TTL configurable, renovación automática dentro de una
> ventana de gracia, y un microservicio de autorización independiente
> consultado con retry/backoff) pidiendo implementar todo el módulo.

**Por qué se usó IA:** Para no partir de cero en el scaffolding de tres
piezas (backend NestJS, microservicio de autorización, frontend) que deben
comunicarse entre sí bajo reglas de seguridad específicas (cookies
httpOnly, JWT de dos tipos, cifrado AES-256-GCM, retry/backoff).

**Resultado y análisis:** La IA generó los tres proyectos completos:
`auth-service` (NestJS + Prisma), `authorization-service` (Express
independiente) y `frontend` (HTML/JS estático), mapeando cada uno de los 9
requerimientos del enunciado a un archivo concreto (documentado en el
README). Se revisó que:
- El access token no llevara datos personales (solo `sub` y `role`).
- La contraseña se guardara con bcrypt en vez de AES reversible, con
  justificación de seguridad explícita en el código y el README.
- El retry/backoff del cliente de autorización distinguiera entre "el
  microservicio respondió que no" (denegar directo) y "no hubo respuesta"
  (reintentar), para no reintentar innecesariamente ante un 403 legítimo.

---

## Prompt 2 — Migrar a npm y ejecutar en Windows/PowerShell

**Prompt:**
> "yarn no se reconoce como comando" / "dame los comandos para npm entonces"

**Por qué se usó IA:** El entorno real (PowerShell en Windows) no tenía
`yarn` instalado; se necesitaba la ruta equivalente con `npm` sin tener que
instalar herramientas adicionales.

**Resultado y análisis:** La IA tradujo cada script de `package.json` a su
equivalente `npm run <script>` / `npx <bin>`, y señaló un error real en el
primer intento: los comandos se habían corrido desde la carpeta raíz del
repo (`P2\P2`) en vez de `auth-service`, donde vive el `package.json`. Sin
ese ajuste, `npm install` habría fallado de inmediato.

---

## Prompt 3 — Error de Prisma 7: `datasource property url is no longer supported`

**Prompt:**
> Se pegó el error completo de `npx prisma generate` (código `P1012`)
> señalando que `url` ya no es válido dentro del bloque `datasource` del
> `schema.prisma`.

**Por qué se usó IA:** Prisma 7 introdujo un cambio incompatible respecto a
versiones anteriores (la URL de conexión debe vivir en `prisma.config.ts`,
y el `PrismaClient` en runtime necesita un *driver adapter* explícito). No
era un error de sintaxis propio sino un cambio de versión del framework.

**Resultado y análisis:** La IA identificó la causa exacta y hizo dos
cambios coordinados: quitar `url` de `schema.prisma`, y modificar
`PrismaService` para pasar un adapter (`@prisma/adapter-pg`) al
constructor de `PrismaClient`. Esto generó, en un segundo momento, un
efecto colateral (ver Prompt 4) que también hubo que resolver.

---

## Prompt 4 — Cadena de errores de TypeScript y resolución de módulos

**Prompt:**
> Se pegaron, en varios turnos, los logs de compilación de `nest start
> --watch` mostrando errores encadenados: `isolatedModules` exigiendo
> `import type`, `cookie-parser` no invocable como namespace import, tipos
> de `expiresIn` incompatibles con `@nestjs/jwt`, `Property 'user' does not
> exist on type 'PrismaService'`, y finalmente `Cannot find module
> '@prisma/client'`.

**Por qué se usó IA:** Eran errores de compatibilidad entre el `tsconfig`
del proyecto (`moduleResolution: nodenext`, `isolatedModules`) y las
versiones más nuevas de las librerías (Prisma 7, `@nestjs/jwt`), difíciles
de diagnosticar sin experiencia previa en ese combo específico de
versiones.

**Resultado y análisis:** Se corrigieron uno por uno: imports `type`-only
en firmas decoradas, import por defecto de `cookie-parser`, cast del
`expiresIn` a `JwtSignOptions`, y (tras un intento fallido de mover el
cliente de Prisma a una carpeta propia, que rompía en `dist/` por rutas
relativas) se volvió al output estándar de Prisma en
`node_modules/@prisma/client`, que sí resuelve bien con `nodenext` una vez
que el paquete está correctamente instalado. Este último punto es un buen
ejemplo de que la primera solución de la IA (output personalizado) no
siempre es la más simple; se evaluó el resultado, se detectó que
complicaba el build de Nest, y se revirtió a favor de la opción estándar.

---

## Prompt 5 — Error de dependencias de NestJS (`UnknownDependenciesException`)

**Prompt:**
> Se pegó el error de arranque de Nest: `JwtCookieAuthGuard` no podía
> resolver `JwtService` dentro de `ProtectedModule`.

**Por qué se usó IA:** Es un error conceptual de arquitectura de módulos de
NestJS (exportación transitiva de providers), no un error de sintaxis.

**Resultado y análisis:** La IA explicó correctamente que `AuthModule`
usaba `JwtModule` internamente pero no lo **exportaba**, así que los
módulos que importan `AuthModule` (como `ProtectedModule`) no heredaban
acceso a `JwtService`. La corrección fue agregar `JwtModule` al array
`exports` de `AuthModule`. Se verificó levantando el servicio: el log de
arranque mostró todas las rutas mapeadas sin errores.

---

## Prompt 6 — CORS bloqueado por origen distinto a `localhost`

**Prompt:**
> Se pegó el error del navegador: `Access to fetch ... has been blocked by
> CORS policy` al abrir el frontend desde `http://192.168.0.4:5173`.

**Por qué se usó IA:** Para diagnosticar rápido si era un bug del backend
o un problema del origen desde el que se accedía.

**Resultado y análisis:** La IA identificó que el mensaje de error ya traía
la causa exacta (el origen configurado en `FRONTEND_ORIGIN` no coincidía
con la IP usada en el navegador) y dio dos soluciones: usar `localhost`
(la más simple) o alinear `FRONTEND_ORIGIN` con la IP de red. Se optó por
la primera para el flujo normal de desarrollo.

---

## Reflexión general

La IA fue más útil para (a) generar la estructura inicial completa
respetando restricciones de seguridad específicas del enunciado, y (b)
depurar errores de compatibilidad entre versiones de librerías (Prisma 7,
NestJS) que requieren conocer cambios recientes no siempre intuitivos. En
al menos un caso (el output personalizado de Prisma) la primera propuesta
de la IA no fue la más simple y hubo que iterar hacia la solución
estándar tras ver el error en `dist/`. Todo el código generado se probó
end-to-end (registro, login, ambas rutas protegidas con ambos roles) antes
de darlo por bueno.
