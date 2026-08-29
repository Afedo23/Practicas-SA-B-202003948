/**
 * OCP: si mañana se quiere cambiar bcrypt por argon2, basta con crear
 * una nueva clase que implemente esta interfaz, sin tocar AuthService.
 */
export interface IPasswordHasher {
  compare(plain: string, hash: string): Promise<boolean>;
}
