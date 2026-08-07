import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationClientModule } from '../authorization-client/authorization-client.module';
import { ProtectedController } from './protected.controller';

@Module({
  imports: [AuthModule, AuthorizationClientModule],
  controllers: [ProtectedController],
})
export class ProtectedModule {}
