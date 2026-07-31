# Documentación de uso de IA (Claude)

Este archivo documenta los prompts usados con Claude durante el desarrollo de la práctica, la respuesta obtenida y los ajustes aplicados, tal como lo pide la sección 3.3 del enunciado.

---

## Prompt 1 — Estructura SOLID inicial

**Prompt:**
> "Quiero realizar esta práctica, ¿puedes darme la estructura de los principios SOLID para realizar mi backend tipo API REST con TypeScript, y darme prompts para preguntar si están bien ejecutados los principios SOLID?"

**Respuesta obtenida (resumen):**
Claude propuso una estructura de carpetas por capas (`domain`/`entities`, `repositories`, `services`, `controllers`, `routes`), explicó cómo aplicar cada uno de los 5 principios SOLID a ese dominio, y entregó 4 prompts adicionales para pedir revisión de SOLID, seguridad OWASP, Dependency Inversion y nombres/código limpio.

**Ajuste aplicado:**
Se usó esta estructura como base conceptual, pero el proyecto real se construyó sobre NestJS (que ya organiza el código en `controller`/`service`/`module`), así que se adaptó la separación de capas a las convenciones de Nest en vez de usar carpetas genéricas `domain`/`routes`.

---

## Prompt 2 — Revisión del scaffolding existente contra el enunciado

**Prompt:**
> "Aquí está mi proyecto NestJS ya iniciado (entidad, DTOs, controller, service, repository para 'users') y aquí el enunciado completo de la práctica. Complétalo con todo lo que pide: los 5 endpoints (incluyendo el PATCH exclusivo de estado que falta), aplicando los principios SOLID correctamente."

**Respuesta obtenida (resumen):**
Claude identificó varios puntos a corregir frente al enunciado:
- El dominio estaba nombrado como `users`/`User`, pero el enunciado pide gestionar "solicitudes operativas" — se renombró todo a `SolicitudOperativa`/`solicitudes`.
- Faltaba el endpoint `PATCH` exclusivo para actualizar solo el campo `estado` (el proyecto original solo tenía `PUT` completo y un `PATCH` que reutilizaba el DTO completo).
- `SolicitudesService` dependía directamente de la clase concreta del repositorio (violación de Dependency Inversion); se introdujo la interfaz `ISolicitudRepository` y un token de inyección.
- No existía un `ValidationPipe` global, por lo que era fácil olvidar `@UsePipes` en un endpoint nuevo; se centralizó en `main.ts` con `whitelist` y `forbidNonWhitelisted`.

**Ajuste aplicado:**
Se implementaron todos los cambios propuestos: nuevo DTO `UpdateEstadoDto`, interfaz `ISolicitudRepository`, repositorio `TypeOrmSolicitudRepository`, endpoint `PATCH /solicitudes/:id/estado`, y `ValidationPipe` global. Se revisó manualmente que cada archivo generado correspondiera exactamente a los campos definidos en el enunciado (`titulo`, `area_solicitante`, `prioridad`, `costo_estimado`, `estado`).

---

## Prompt 3 — Seguridad de entradas y prevención de inyección SQL

**Prompt:**
> "Revisa los DTO y el repositorio de mi API: ¿hay riesgo de inyección SQL o de asignación masiva de campos no esperados? Sugiere validaciones concretas."

**Respuesta obtenida (resumen):**
Claude señaló que, al usar los métodos de TypeORM (`findOneBy`, `update`, `create`) sin concatenar SQL manualmente, las consultas ya quedan parametrizadas y protegidas contra inyección SQL. Recomendó además agregar límites explícitos de longitud/rango en los DTO (`MaxLength`, `Min`/`Max`, `maxDecimalPlaces`) y usar `ParseUUIDPipe` en los parámetros de ruta para rechazar ids mal formados antes de llegar a la base de datos.

**Ajuste aplicado:**
Se agregaron `@MaxLength(150)` en `titulo`, `@MaxLength(100)` en `area_solicitante`, `@Min(0)` y `maxDecimalPlaces: 2` en `costo_estimado`, y `ParseUUIDPipe` en los tres endpoints que reciben `:id` como parámetro.

---

## Prompt 4 — Revisión de nombres y responsabilidad única

**Prompt:**
> "¿Los nombres de clases y métodos en `solicitudes.service.ts` y `solicitudes.repository.ts` son suficientemente descriptivos? ¿Alguna función mezcla más de una responsabilidad?"

**Respuesta obtenida (resumen):**
Claude sugirió extraer la verificación de existencia de una solicitud (repetida en `update`, `updateEstado` y `remove`) a un método privado propio (`assertExists`) en vez de duplicar la misma lógica de `findById` + lanzar `NotFoundException` en cada método público, para mantener cada método enfocado en una sola tarea.

**Ajuste aplicado:**
Se creó el método privado `assertExists(id)` en `SolicitudesService` y se reutiliza en los tres métodos que lo necesitan, eliminando la duplicación.

---

## Prompt 5 — Cambio de UUID a entero autoincremental

**Prompt:**
> "El id me está devolviendo un UUID muy largo, ¿puedes cambiarlo para que genere enteros del 1 en adelante?"

**Respuesta obtenida (resumen):**
Claude señaló que el enunciado permite explícitamente "Entero o UUID" (sección 3.1), por lo que el cambio es válido. Indicó los archivos a modificar: el tipo de `id` en la entidad (`@PrimaryGeneratedColumn()` sin `'uuid'`), la interfaz `ISolicitudRepository`, el repositorio, el service y el controlador (cambiando `ParseUUIDPipe` por `ParseIntPipe`), para mantener el tipo `number` consistente en toda la cadena.

**Ajuste aplicado:**
Se cambió `id` de `string` (UUID) a `number` en la entidad, la interfaz del repositorio, el repositorio, el service y el controlador; y `ParseUUIDPipe` se reemplazó por `ParseIntPipe` en los tres endpoints que reciben `:id`. Se recompiló (`tsc --noEmit`) y se corrió `eslint --fix` para confirmar que no quedaran inconsistencias de tipos.
