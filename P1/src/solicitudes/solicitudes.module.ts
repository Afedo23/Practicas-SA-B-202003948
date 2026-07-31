import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudOperativa } from './entities/solicitud-operativa.entity';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';
import { TypeOrmSolicitudRepository } from './solicitudes.repository';
import { SOLICITUD_REPOSITORY } from './interfaces/solicitud-repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([SolicitudOperativa])],
  controllers: [SolicitudesController],
  providers: [
    SolicitudesService,
    // Aquí ocurre la inversión de dependencias: el módulo decide qué
    // implementación concreta corresponde al contrato ISolicitudRepository.
    // Si mañana se quisiera cambiar de PostgreSQL a otra fuente, solo se
    // cambia esta línea; SolicitudesService no se toca.
    { provide: SOLICITUD_REPOSITORY, useClass: TypeOrmSolicitudRepository },
  ],
})
export class SolicitudesModule {}
