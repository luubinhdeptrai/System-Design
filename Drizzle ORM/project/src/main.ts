import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * Global ValidationPipe — runs on every request body automatically.
   *
   * whitelist: true          — strip properties not declared in the DTO
   * forbidNonWhitelisted: true — throw 400 if unknown properties are sent
   * transform: true          — coerce body primitives to DTO types (e.g., "true" → true)
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
