import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppConfigService } from '../config/app-config.service';
import type { AccessTokenPayload } from './auth.service';
import { AuthService } from './auth.service';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from './cookie.util';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtCookieAuthGuard } from './guards/jwt-cookie-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { user };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateCredentials(dto);
    const tokens = this.authService.issueTokens(user);
    setAuthCookies(res, this.config, tokens);
    return { user };
  }

  // Renovación explícita (además de la renovación silenciosa que hace el guard
  // dentro de la ventana de gracia). Útil para que el frontend fuerce un refresh.
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    const { accessToken, user } = await this.authService.renewAccessToken(refreshToken);
    setAuthCookies(res, this.config, { accessToken });
    return { user };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res);
    return { message: 'Sesión cerrada' };
  }

  // Usado por la página de confirmación tras un login exitoso para mostrar
  // los datos del usuario autenticado.
  @Get('me')
  @UseGuards(JwtCookieAuthGuard)
  async me(@CurrentUser() payload: AccessTokenPayload) {
    const user = await this.authService.findSafeUserById(payload.sub);
    return { user };
  }
}
