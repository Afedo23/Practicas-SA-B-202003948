# Principios SOLID aplicados en el proyecto

A continuación se explica, con palabras propias, cada principio y se señala
dónde y cómo se aplicó en el código de este sistema, con fragmentos reales.

## 1. S — Single Responsibility Principle (Responsabilidad Única)

Una clase debe tener una sola razón para cambiar. Si mezclamos, por ejemplo,
acceso a base de datos con reglas de negocio, cualquier cambio en una de las
dos cosas obliga a tocar la misma clase por motivos distintos.

**Evidencia:** `auth-service/src/infrastructure/PostgresUserRepository.ts` solo
sabe traducir entre la tabla `usuarios` de Postgres y la entidad `User`. No
conoce JWT ni reglas de autenticación:

```ts
export class PostgresUserRepository implements IUserRepository {
  async findByUsername(username: string): Promise<User | null> {
    const result = await pool.query(
      "SELECT id, username, password_hash, rol FROM usuarios WHERE username = $1",
      [username]
    );
    ...
  }
}
```

La regla de negocio de "qué significa autenticarse" vive aparte, en
`AuthService` (ver principio D). Si cambia el motor de base de datos, solo se
toca el repositorio; si cambia la regla de negocio, solo se toca el servicio.

## 2. O — Open/Closed Principle (Abierto/Cerrado)

Una clase debe poder extenderse con nuevo comportamiento sin modificar su
código existente.

**Evidencia:** `auth-service/src/domain/IPasswordHasher.ts` define un contrato
para comparar contraseñas:

```ts
export interface IPasswordHasher {
  compare(plain: string, hash: string): Promise<boolean>;
}
```

Hoy existe una única implementación, `BcryptPasswordHasher`. Si mañana se
quisiera migrar a `argon2`, basta con crear `Argon2PasswordHasher implements
IPasswordHasher` e inyectarla en `main.ts` — **sin modificar** `AuthService`,
que sigue trabajando contra la interfaz. Lo mismo aplica a
`ITokenProvider` (hoy JWT, mañana podría ser otro esquema de tokens).

## 3. L — Liskov Substitution Principle (Sustitución de Liskov)

Cualquier implementación de una interfaz debe poder sustituir a otra sin
romper el comportamiento esperado por quien la usa.

**Evidencia:** en `solicitudes-service/src/domain/IEventPublisher.ts` se define:

```ts
export interface IEventPublisher {
  publish(evento: string, payload: Record<string, unknown>): Promise<void>;
}
```

Existen dos implementaciones intercambiables:

- `HttpNotificacionesPublisher` (envía el evento por HTTP al `notificaciones-service`)
- `ConsoleEventPublisher` (solo imprime el evento en consola)

```ts
export class ConsoleEventPublisher implements IEventPublisher {
  async publish(evento: string, payload: Record<string, unknown>): Promise<void> {
    console.log(`[evento] ${evento}`, payload);
  }
}
```

`SolicitudService.crear()` llama a `this.eventPublisher.publish(...)` sin
saber ni importarle cuál de las dos implementaciones recibió: ambas cumplen
el mismo contrato (reciben `(evento, payload)`, no lanzan excepciones que
interrumpan el flujo) y son verdaderamente sustituibles entre sí.

## 4. I — Interface Segregation Principle (Segregación de Interfaces)

Ninguna clase debe verse obligada a depender de métodos que no usa; es mejor
tener varias interfaces pequeñas y específicas que una grande y genérica.

**Evidencia:** `auth-service/src/domain/IUserRepository.ts` expone únicamente
lo que el flujo de autenticación necesita:

```ts
export interface IUserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
}
```

No incluye `create`, `update`, `delete` ni `listAll`, que corresponderían a un
módulo de administración de usuarios distinto (fuera del alcance de
autenticación). De forma equivalente, en Python,
`aprobaciones-service/app/domain/repository.py` define `AprobacionRepositoryBase`
solo con los 4 métodos que el flujo maker-checker-authorizer necesita
(`crear_paso`, `listar_por_solicitud`, `obtener_pendiente`, `resolver_paso`),
sin forzar operaciones de administración genérica de aprobaciones.

## 5. D — Dependency Inversion Principle (Inversión de Dependencias)

Los módulos de alto nivel (reglas de negocio) no deben depender de módulos de
bajo nivel (detalles técnicos); ambos deben depender de abstracciones.

**Evidencia:** `AuthService` recibe sus dependencias por constructor, como
interfaces, no como clases concretas:

```ts
export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenProvider: ITokenProvider
  ) {}
  ...
}
```

Las implementaciones concretas (`PostgresUserRepository`, `BcryptPasswordHasher`,
`JwtTokenProvider`) se construyen e inyectan solo en el punto de composición,
`auth-service/src/index.ts`:

```ts
const userRepository = new PostgresUserRepository();
const passwordHasher = new BcryptPasswordHasher();
const tokenProvider = new JwtTokenProvider();
const authService = new AuthService(userRepository, passwordHasher, tokenProvider);
```

El mismo patrón se replica en Python: `AprobacionService` depende de la clase
abstracta `AprobacionRepositoryBase`, y `app/main.py` inyecta la implementación
concreta `SqlAlchemyAprobacionRepository` únicamente al construir el servicio
(`get_service`). Esto permite, en pruebas unitarias, inyectar un repositorio
falso (mock) sin tocar la lógica de negocio.
