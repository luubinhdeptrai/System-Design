import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Proxy trust ─────────────────────────────────────────────────────────
  // Required if this server sits behind nginx, a load balancer, or any
  // reverse proxy. Without this:
  //   - req.ip resolves to the proxy's IP, breaking IP-based rate limiting
  //   - Secure cookie detection may fail in some environments
  app.getHttpAdapter().getInstance().set("trust proxy", 1);

  // ── CORS ─────────────────────────────────────────────────────────────────
  // `credentials: true` is mandatory for the browser to send/receive the
  // session cookie on cross-origin requests.
  // `origin` must explicitly list each allowed frontend URL (no wildcards
  // when credentials: true is set — the browser blocks wildcards).
  const allowedOrigins = (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // ── Global validation ────────────────────────────────────────────────────
  // Validates incoming request bodies against DTO class-validator decorators.
  // `whitelist: true` strips any properties not declared in the DTO.
  // `forbidNonWhitelisted: true` returns a 400 if unknown properties are sent.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n🚀 Server running on http://localhost:${port}`);
  console.log(`   Auth endpoints: http://localhost:${port}/api/auth/*`);
  console.log(`   Users API:      http://localhost:${port}/users/me`);
  console.log(`   Posts API:      http://localhost:${port}/posts\n`);
}

bootstrap();
