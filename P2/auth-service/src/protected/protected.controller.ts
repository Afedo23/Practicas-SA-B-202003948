import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AccessTokenPayload } from '../auth/auth.service';
import { JwtCookieAuthGuard } from '../auth/guards/jwt-cookie-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/role.enum';

@Controller('protected')
@UseGuards(JwtCookieAuthGuard, RolesGuard)
export class ProtectedController {
  // Ruta 1: solo Admin. La verificación de rol la hace el authorization-service.
  @Get('route1')
  @Roles(Role.ADMIN)
  route1(@CurrentUser() user: AccessTokenPayload) {
    return {
      message: 'Acceso permitido a Ruta 1 (solo Admin)',
      userId: user.sub,
      role: user.role,
    };
  }

  // Ruta 2: Admin y Cliente.
  @Get('route2')
  @Roles(Role.ADMIN, Role.CLIENTE)
  route2(@CurrentUser() user: AccessTokenPayload) {
    return {
      message: 'Acceso permitido a Ruta 2 (Admin y Cliente)',
      userId: user.sub,
      role: user.role,
    };
  }
}
