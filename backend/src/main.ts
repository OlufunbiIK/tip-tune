import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const apiVersion = process.env.API_VERSION || 'v1';

  // Enable cookie parser
  app.use(cookieParser());

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use((_, res, next) => {
    res.setHeader('API-Version', apiVersion);
    next();
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion.replace(/^v/i, ''),
  });

  // API prefix
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'ready', method: RequestMethod.ALL },
      { path: 'live', method: RequestMethod.ALL },
    ],
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('TipTune API')
    .setDescription('API for TipTune audio upload and streaming platform')
    .setVersion('1.0')
    .addTag('tracks')
    .addTag('users')
    .addTag('search')
    .addTag('Authentication')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
