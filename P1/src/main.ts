import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // ValidationPipe global: aplica los decoradores de class-validator a
  // TODOS los endpoints automáticamente (antes se repetía @UsePipes en
  // cada ruta, lo cual es fácil de olvidar en un endpoint nuevo).
  // - whitelist: elimina cualquier propiedad que no esté en el DTO.
  // - forbidNonWhitelisted: rechaza la petición si llegan propiedades
  //   extra, en vez de ignorarlas silenciosamente (evita que alguien
  //   intente inyectar campos no esperados, como un "id" o "isAdmin").
  // - transform: convierte los payloads planos a instancias de la clase
  //   DTO para que los decoradores de tipo (@IsInt, etc.) funcionen bien.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
