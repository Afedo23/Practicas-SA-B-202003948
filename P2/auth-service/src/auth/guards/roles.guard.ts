import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthorizationClientService } from '../../authorization-client/authorization-client.service';
import { ACCESS_COOKIE } from '../cookie.util';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationClient: AuthorizationClientService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    // JwtCookieAuthGuard corre antes y ya deja el token (posiblemente renovado) en la cookie.
    const token: string | undefined = req.cookies?.[ACCESS_COOKIE];
    // Identificador estable de la ruta, independiente de nombres de método (ej. "GET /protected/route1").
    const routePath = (req.route?.path as string) ?? req.path;
    const routeId = `${req.method} ${routePath}`;

    if (!token) {
      throw new ForbiddenException('Acceso denegado');
    }

    // La decisión de autorización NO se toma localmente: se delega al microservicio
    // de autorización independiente (Requerimiento 9).
    const allowed = await this.authorizationClient.checkAccess(token, routeId);
    if (!allowed) {
      throw new ForbiddenException('No tienes permiso para acceder a este recurso');
    }
    return true;
  }
}
