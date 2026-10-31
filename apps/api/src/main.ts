import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
        },
      },
    }),
  );

  // Cookie parser
  app.use(cookieParser());

  // Global prefix
  app.setGlobalPrefix('api');

  // API versioning
  app.enableVersioning({ type: VersioningType.URI });

  // CORS — FRONTEND_URL may carry a comma-separated list of allowed origins
  // (trailing slashes normalized); non-browser requests (no Origin header)
  // are always allowed, unknown browser origins are rejected.
  const corsOrigins = [
    'https://web-smoky-chi-41.vercel.app',
    'https://make-a-thon.onrender.com',
    'http://localhost:3000',
    'http://localhost:3001',
    ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
  ]
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  console.log(`CORS enabled for origins: ${corsOrigins.join(', ')}`);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // server-to-server / curl
      if (
        corsOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'x-custom-tenant-id'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Brightloop SMS API')
    .setDescription('Subscription Management System REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Render injects PORT; API_PORT is honored for local/custom deployments
  const port = Number(process.env.PORT || process.env.API_PORT || 3001);
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
