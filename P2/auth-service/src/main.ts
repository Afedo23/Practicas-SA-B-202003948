import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: config.frontendOrigin,
    credentials: true, // necesario para que el navegador envíe/reciba cookies httpOnly
  });

  await app.listen(config.port);
  // eslint-disable-next-line no-console
  console.log(`auth-service escuchando en http://localhost:${config.port}`);
}
bootstrap();
