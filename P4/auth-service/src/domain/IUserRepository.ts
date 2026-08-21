import { User } from "./User";

/**
 * ISP: interfaz reducida a lo que un consumidor de autenticación
 * realmente necesita, sin forzar operaciones de administración de usuarios
 * (crear, borrar, listar) que no le corresponden a este contrato.
 */
export interface IUserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
}
