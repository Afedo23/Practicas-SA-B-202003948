import { IUserRepository } from "../domain/IUserRepository";
import { IPasswordHasher } from "../domain/IPasswordHasher";
import { ITokenProvider } from "../domain/ITokenProvider";

/**
 * DIP: AuthService no depende de PostgresUserRepository, BcryptPasswordHasher
 * ni JwtTokenProvider concretos — depende únicamente de las interfaces
 * definidas en /domain. Las implementaciones concretas se inyectan por
 * el constructor (ver index.ts), lo que permite reemplazarlas o usar
 * dobles de prueba (mocks) sin modificar esta clase.
 *
 * SRP: su única responsabilidad es la regla de negocio "autenticar".
 */
export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenProvider: ITokenProvider
  ) {}

  async login(username: string, password: string): Promise<{ token: string; rol: string } | null> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) return null;

    const validPassword = await this.passwordHasher.compare(password, user.passwordHash);
    if (!validPassword) return null;

    const token = this.tokenProvider.sign(user);
    return { token, rol: user.rol };
  }

  async me(userId: number) {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;
    return { id: user.id, username: user.username, rol: user.rol };
  }

  verifyToken(token: string) {
    return this.tokenProvider.verify(token);
  }
}
