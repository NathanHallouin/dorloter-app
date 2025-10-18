/**
 * Point d'entrée de l'API Dorloter (NestJS).
 *
 * Migration du schéma au démarrage, CORS pour les SPA (web/pro) et le mobile,
 * routes sous `/api/v1`, format d'erreur unifié. L'authentification est appliquée
 * PAR HANDLER via le décorateur `@Auth()` : un endpoint sans ce décorateur est
 * public.
 */

import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { loadConfig } from './config';
import { createPool } from './infra/database/database.module';
import { migrate } from './infra/database/migrator';
import { AppExceptionFilter } from './shared/app-exception.filter';
import { createValidationPipe } from './shared/validation';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const config = loadConfig();

  if (config.autoMigrate) {
    // Migrations via la connexion DDL dédiée (rôle à privilèges) si fournie
    // (ConnectionStrings__Migrations), sinon via la connexion applicative.
    const migrationPool = createPool(config.dbMigrations ?? config.db);
    try {
      await migrate(migrationPool);
    } finally {
      await migrationPool.end();
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  // Derrière Caddy : l'IP réelle du client provient de X-Forwarded-For (refresh tokens).
  app.set('trust proxy', true);
  app.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    exposedHeaders: ['x-request-id', 'retry-after'],
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AppExceptionFilter());
  app.enableShutdownHooks();

  await app.listen(config.port, config.bindAddress);
  logger.log(`API Dorloter démarrée sur ${config.bindAddress}:${config.port}`);
}

void bootstrap();
