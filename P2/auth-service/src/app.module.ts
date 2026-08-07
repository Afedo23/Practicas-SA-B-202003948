import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { CryptoModule } from './crypto/crypto.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProtectedModule } from './protected/protected.module';

@Module({
  imports: [AppConfigModule, PrismaModule, CryptoModule, AuthModule, ProtectedModule],
})
export class AppModule {}
