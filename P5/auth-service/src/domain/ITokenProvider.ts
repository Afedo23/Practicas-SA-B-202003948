import { User } from "./User";

/**
 * OCP/DIP: AuthService depende de esta abstracción, no de la librería
 * concreta jsonwebtoken. Permite sustituir JWT por otro esquema de
 * tokens (paseto, sesiones opacas) implementando esta interfaz.
 */
export interface ITokenProvider {
  sign(user: User): string;
  verify(token: string): { id: number; username: string; rol: string } | null;
}
