import { SolicitudOperativa } from '../entities/solicitud-operativa.entity';

/**
 * Contrato que debe cumplir cualquier fuente de datos de solicitudes
 * operativas (PostgreSQL hoy, en memoria en pruebas, otro motor mañana).
 *
 * - Dependency Inversion: SolicitudesService depende de esta abstracción,
 *   nunca de una clase concreta de acceso a datos.
 * - Liskov Substitution: cualquier clase que implemente esta interfaz debe
 *   poder sustituir a otra sin romper el comportamiento esperado (por
 *   ejemplo, findById siempre retorna la entidad o null, nunca lanza
 *   una excepción por "no encontrado").
 * - Interface Segregation: solo se exponen los métodos que el dominio de
 *   solicitudes realmente necesita, nada de operaciones genéricas de más.
 */
export interface ISolicitudRepository {
  findAll(): Promise<SolicitudOperativa[]>;
  // id numérico autoincremental (ver 3.1 del enunciado: "Entero o UUID")
  findById(id: number): Promise<SolicitudOperativa | null>;
  create(data: CreateSolicitudData): Promise<SolicitudOperativa>;
  update(
    id: number,
    data: Partial<SolicitudOperativa>,
  ): Promise<SolicitudOperativa>;
  delete(id: number): Promise<void>;
}

export type CreateSolicitudData = Omit<SolicitudOperativa, 'id'>;

// Token de inyección: NestJS no puede inyectar una interfaz de TypeScript
// en tiempo de ejecución (se borra al compilar), así que se usa este
// símbolo como identificador para el contenedor de dependencias.
export const SOLICITUD_REPOSITORY = Symbol('SOLICITUD_REPOSITORY');
