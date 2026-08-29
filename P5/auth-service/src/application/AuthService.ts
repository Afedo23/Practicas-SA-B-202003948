import { IUserRepository } from "../domain/IUserRepository";
import { IPasswordHasher } from "../domain/IPasswordHasher";
import { ITokenProvider } from "../domain/ITokenProvider";
import { IEmailService } from "../infrastructure/EmailService";

/**
 * DIP: AuthService no depende de PostgresUserRepository, BcryptPasswordHasher,
 * JwtTokenProvider ni SmtpEmailService concretos — depende únicamente de las
 * interfaces. Las implementaciones concretas se inyectan por el constructor
 * (ver index.ts), lo que permite reemplazarlas o usar dobles de prueba
 * (mocks) sin modificar esta clase.
 *
 * SRP: su única responsabilidad es la regla de negocio "autenticar", que
 * ahora incluye "avisar por correo tras un login exitoso" como efecto
 * secundario de esa misma regla (no una responsabilidad nueva y separada).
 */
export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenProvider: ITokenProvider,
    private readonly emailService: IEmailService
  ) {}

  async login(username: string, password: string): Promise<{ token: string; rol: string } | null> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) return null;

    const validPassword = await this.passwordHasher.compare(password, user.passwordHash);
    if (!validPassword) return null;

    const token = this.tokenProvider.sign(user);

    // Efecto secundario del login: se envía el token también por correo.
    // No se espera (await) de forma bloqueante para no retrasar la
    // respuesta del login; un fallo de correo no debe afectar el login.
    this.emailService.enviarTokenAcceso(user.email, user.username, token).catch(() => {});

    return { token, rol: user.rol };
  }

  async me(userId: number) {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;
    return { id: user.id, username: user.username, email: user.email, rol: user.rol };
  }

  verifyToken(token: string) {
    return this.tokenProvider.verify(token);
  }
}
