import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { DatabaseSeederService } from './database/database-seeder.service';

/**
 * Bootstrap function to start the Samanin backend application
 * Configures Swagger documentation, validation pipes, and CORS
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable cookie parsing
  app.use(cookieParser());

  // Enable CORS for frontend integration
  app.enableCors({
    origin: [
      'http://localhost:3001', // Frontend development
      'http://localhost:3000', // Alternative frontend port
      'http://46.249.100.10:3001', // External IP frontend
      'http://46.249.100.10:3000', // External IP alternative frontend port
      configService.get('FRONTEND_URL'),
    ].filter(Boolean),
    credentials: true,
  });

  // Global API prefix
  const apiPrefix = configService.get('API_PREFIX') || 'api';
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe with transformation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Swagger API documentation setup
  const config = new DocumentBuilder()
    .setTitle('Samanin API')
    .setDescription(
      'Multi-tenant rental management platform API documentation for Phase 1 - User Registration and Tenant Creation',
    )
    .setVersion('1.0.0')
    .setContact('Samanin Platform', '', 'support@samanin.com')
    .addServer('https://api.samanin.com', 'Production server')
    .addServer('https://staging-api.samanin.com', 'Staging server')
    .addServer('http://localhost:3000', 'Development server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'JWT token-based authentication (not used for registration endpoint)',
      },
      'bearerAuth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Run database seeders on startup
  const seederService = app.get(DatabaseSeederService);
  await seederService.runSeeders();

  // Start the server
  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 Samanin Backend is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});
