# API REST — Solicitudes Operativas (Software Avanzado, P1)
## Carlos Alfredo Barrientos López - 202003948

API backend construida con **NestJS + TypeScript + PostgreSQL (TypeORM)** para gestionar las solicitudes operativas de una academia ficticia, aplicando los principios SOLID y buenas prácticas de código limpio y seguro.

## Contenido

- [Cómo ejecutar el proyecto](#cómo-ejecutar-el-proyecto)
- [Endpoints](#endpoints)
- [Principios SOLID aplicados](#principios-solid-aplicados)
- [Seguridad](#seguridad)

## Cómo ejecutar el proyecto

```bash
npm install
cp .env.example .env   # completar DATABASE_URL con tus credenciales de Postgres
npm run start:dev
```

## Endpoints

| Método | Ruta                     | Descripción                                             |
|--------|--------------------------|-----------------------------------------------------------|
| GET    | `/solicitudes`           | Obtiene todas las solicitudes operativas                  |
| POST   | `/solicitudes`           | Registra una nueva solicitud operativa                    |
| PUT    | `/solicitudes/:id`       | Actualiza completamente una solicitud existente            |
| PATCH  | `/solicitudes/:id/estado`| Actualiza **exclusivamente** el campo `estado`             |
| DELETE | `/solicitudes/:id`       | Elimina una solicitud operativa                            |

Ejemplo de body para `POST /solicitudes`:

```json
{
  "titulo": "Adquisición de nuevo servidor",
  "area_solicitante": "Infraestructura TI",
  "prioridad": 3,
  "costo_estimado": 2500.00,
  "estado": "registrada"
}
```

Ejemplo de body para `PATCH /solicitudes/:id/estado`:

```json
{ "estado": "en_proceso" }
```

> El `id` es un entero autoincremental (1, 2, 3...) generado por PostgreSQL — el enunciado permite "Entero o UUID" (sección 3.1) y se optó por entero para respuestas más simples de leer/probar.

## Principios SOLID aplicados

### 1. Single Responsibility Principle (SRP)

Cada clase tiene una única razón para cambiar. El controlador no sabe nada de base de datos ni de reglas de negocio; solo traduce HTTP:

```ts
// solicitudes.controller.ts
@Post()
create(@Body() dto: CreateSolicitudDto) {
  return this.service.create(dto);
}
```

La lógica de negocio (por ejemplo, verificar que la solicitud exista antes de actualizarla) vive solo en el service:

```ts
// solicitudes.service.ts
async update(id: string, dto: CreateSolicitudDto): Promise<SolicitudOperativa> {
  await this.assertExists(id);
  return this.repository.update(id, dto);
}
```

Y el acceso a datos vive solo en el repositorio (`solicitudes.repository.ts`), que únicamente sabe hablar con TypeORM.

### 2. Open/Closed Principle (OCP)

El sistema está abierto a extensión pero cerrado a modificación. El estado de una solicitud es un `enum` (`EstadoSolicitud`); si en el futuro se necesita un nuevo estado, se **extiende** el enum sin tener que modificar el controlador, el service ni el repositorio:

```ts
// solicitud-operativa.entity.ts
export enum EstadoSolicitud {
  REGISTRADA = 'registrada',
  EN_PROCESO = 'en_proceso',
  FINALIZADA = 'finalizada',
}
```

Del mismo modo, si se necesitara agregar una nueva fuente de datos, basta con crear una nueva clase que implemente `ISolicitudRepository` — no hay que tocar `SolicitudesService`.

### 3. Liskov Substitution Principle (LSP)

Cualquier clase que implemente `ISolicitudRepository` debe poder sustituir a `TypeOrmSolicitudRepository` sin romper el comportamiento esperado por `SolicitudesService`. El contrato garantiza, por ejemplo, que `findById` siempre retorna la entidad o `null` (nunca lanza una excepción por "no encontrado"):

```ts
// solicitud-repository.interface.ts
export interface ISolicitudRepository {
  findAll(): Promise<SolicitudOperativa[]>;
  findById(id: string): Promise<SolicitudOperativa | null>;
  create(data: CreateSolicitudData): Promise<SolicitudOperativa>;
  update(id: string, data: Partial<SolicitudOperativa>): Promise<SolicitudOperativa>;
  delete(id: string): Promise<void>;
}
```

Esto permite, por ejemplo, crear un `InMemorySolicitudRepository` para pruebas unitarias que se comporte exactamente igual desde el punto de vista del service.

### 4. Interface Segregation Principle (ISP)

`ISolicitudRepository` solo expone los métodos que el dominio de solicitudes operativas realmente necesita (`findAll`, `findById`, `create`, `update`, `delete`). No se creó una interfaz genérica "todo en uno" que forzara a implementar operaciones que este dominio no usa, evitando dependencias innecesarias.

### 5. Dependency Inversion Principle (DIP)

`SolicitudesService` depende de la **abstracción** `ISolicitudRepository`, nunca de la clase concreta `TypeOrmSolicitudRepository`:

```ts
// solicitudes.service.ts
constructor(
  @Inject(SOLICITUD_REPOSITORY)
  private readonly repository: ISolicitudRepository,
) {}
```

Es el módulo el que decide, en un solo lugar, qué implementación concreta corresponde a esa abstracción:

```ts
// solicitudes.module.ts
providers: [
  SolicitudesService,
  { provide: SOLICITUD_REPOSITORY, useClass: TypeOrmSolicitudRepository },
],
```

Si mañana se cambiara de PostgreSQL a otro motor, solo se modifica esta línea del módulo; el service permanece intacto.

## Seguridad

- **Validación de entradas**: `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted` (en `main.ts`) rechaza cualquier campo no declarado en el DTO, evitando asignación masiva de propiedades no esperadas.
- **Prevención de inyección SQL**: todas las operaciones de base de datos usan el query builder / métodos parametrizados de TypeORM (`findOneBy`, `update`, `delete`), nunca concatenación de strings SQL.
- **Validación de tipos por campo**: `prioridad` limitado a un entero entre 1 y 5, `costo_estimado` numérico no negativo, `estado` restringido al enum `EstadoSolicitud` — evita valores inválidos o fuera de rango.
- **Validación de formato de `id`**: `ParseUUIDPipe` en los parámetros de ruta rechaza ids mal formados antes de que lleguen a la base de datos.
- **`synchronize` condicionado por entorno**: activo solo fuera de `production`, para no arriesgar el esquema de una base de datos real.
