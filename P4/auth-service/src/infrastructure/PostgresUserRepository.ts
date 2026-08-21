import { IUserRepository } from "../domain/IUserRepository";
import { User } from "../domain/User";
import { pool } from "./db";

/**
 * SRP: esta clase tiene una única razón para cambiar — la forma en que
 * los usuarios se leen desde Postgres. No conoce JWT, ni hashing, ni
 * reglas de negocio de autenticación; eso vive en AuthService.
 */
export class PostgresUserRepository implements IUserRepository {
  async findByUsername(username: string): Promise<User | null> {
    const result = await pool.query(
      "SELECT id, username, password_hash, rol FROM usuarios WHERE username = $1",
      [username]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return { id: row.id, username: row.username, passwordHash: row.password_hash, rol: row.rol };
  }

  async findById(id: number): Promise<User | null> {
    const result = await pool.query(
      "SELECT id, username, password_hash, rol FROM usuarios WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return { id: row.id, username: row.username, passwordHash: row.password_hash, rol: row.rol };
  }
}
