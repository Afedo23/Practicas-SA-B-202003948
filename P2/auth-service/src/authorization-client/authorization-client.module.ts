import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthorizationClientService } from './authorization-client.service';

@Module({
  imports: [HttpModule],
  providers: [AuthorizationClientService],
  exports: [AuthorizationClientService],
})
export class AuthorizationClientModule {}
