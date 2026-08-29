export type Rol = "maker" | "checker" | "authorizer" | "admin";

export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  rol: Rol;
}
