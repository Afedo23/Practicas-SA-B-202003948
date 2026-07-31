import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SolicitudesModule } from './solicitudes/solicitudes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      autoLoadEntities: true,
      // "synchronize" recrea el esquema automáticamente a partir de las
      // entidades. Es cómodo en desarrollo, pero riesgoso en producción
      // (puede alterar o perder datos), así que se restringe por entorno.
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    SolicitudesModule,
  ],
})
export class AppModule {}
