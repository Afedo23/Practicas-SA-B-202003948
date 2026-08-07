import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppConfigService } from '../config/app-config.service';
import { AesService } from '../crypto/aes.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from './role.enum';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aes: AesService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const emailHash = this.aes.hashEmail(dto.email);
    const existing = await this.prisma.user.findUnique({ where: { emailHash } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        nameCipher: this.aes.encrypt(dto.name),
        emailCipher: this.aes.encrypt(dto.email),
        emailHash,
        passwordHash,
        role: dto.role ?? Role.CLIENTE,
      },
    });

    return this.toSafeUser(user);
  }

  async validateCredentials(dto: LoginDto): Promise<SafeUser> {
    const emailHash = this.aes.hashEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { emailHash } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.toSafeUser(user);
  }

  issueTokens(user: SafeUser) {
    const accessPayload: AccessTokenPayload = { sub: user.id, role: user.role, type: 'access' };
    const refreshPayload: RefreshTokenPayload = { sub: user.id, type: 'refresh' };

    const accessToken = this.jwt.sign(accessPayload, {
      secret: this.config.jwtAccessSecret,
      expiresIn: this.config.jwtAccessTtl,
    } as JwtSignOptions);
    const refreshToken = this.jwt.sign(refreshPayload, {
      secret: this.config.jwtRefreshSecret,
      expiresIn: this.config.jwtRefreshTtl,
    } as JwtSignOptions);

    return { accessToken, refreshToken };
  }

  /** Emite un nuevo access token a partir de un refresh token válido. */
  async renewAccessToken(refreshToken: string): Promise<{ accessToken: string; user: SafeUser }> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwt.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const safeUser = this.toSafeUser(user);
    const accessPayload: AccessTokenPayload = {
      sub: safeUser.id,
      role: safeUser.role,
      type: 'access',
    };
    const accessToken = this.jwt.sign(accessPayload, {
      secret: this.config.jwtAccessSecret,
      expiresIn: this.config.jwtAccessTtl,
    } as JwtSignOptions);
    return { accessToken, user: safeUser };
  }

  async findSafeUserById(id: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toSafeUser(user) : null;
  }

  private toSafeUser(user: {
    id: string;
    nameCipher: string;
    emailCipher: string;
    role: Role;
  }): SafeUser {
    return {
      id: user.id,
      name: this.aes.decrypt(user.nameCipher),
      email: this.aes.decrypt(user.emailCipher),
      role: user.role,
    };
  }
}
