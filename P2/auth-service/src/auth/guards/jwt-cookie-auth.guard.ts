import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import type { AccessTokenPayload } from '../auth.service';
import { AuthService } from '../auth.service';
import { ACCESS_COOKIE, REFRESH_COOKIE, setAuthCookies } from '../cookie.util';

@Injectable()
export class JwtCookieAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const accessToken: string | undefined = req.cookies?.[ACCESS_COOKIE];

    if (!accessToken) {
      throw new UnauthorizedException('No hay sesión activa');
    }

    try {
      const payload = this.jwt.verify<AccessTokenPayload>(accessToken, {
        secret: this.config.jwtAccessSecret,
      });
      req['user'] = payload;
      return true;
    } catch (err) {
      if (!(err instanceof TokenExpiredError)) {
        throw new UnauthorizedException('Token inválido');
      }
      // Token expirado: revisar si sigue dentro de la ventana de gracia configurable
      // (Requerimiento 5: renovación automática si el tiempo desde el vencimiento < X).
      const secondsSinceExpiry = (Date.now() - err.expiredAt.getTime()) / 1000;
      if (secondsSinceExpiry > this.config.jwtRenewalGraceSeconds) {
        throw new UnauthorizedException('Sesión expirada, inicia sesión nuevamente');
      }

      const refreshToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
      if (!refreshToken) {
        throw new UnauthorizedException('Sesión expirada, inicia sesión nuevamente');
      }

      const { accessToken: newAccessToken, user } =
        await this.authService.renewAccessToken(refreshToken);
      setAuthCookies(res, this.config, { accessToken: newAccessToken });
      req['user'] = { sub: user.id, role: user.role, type: 'access' } as AccessTokenPayload;
      return true;
    }
  }
}
