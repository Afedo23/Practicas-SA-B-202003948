import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthorizationClientModule } from '../authorization-client/authorization-client.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtCookieAuthGuard } from './guards/jwt-cookie-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [JwtModule.register({}), AuthorizationClientModule],
  controllers: [AuthController],
  providers: [AuthService, JwtCookieAuthGuard, RolesGuard],
  exports: [AuthService, JwtCookieAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
