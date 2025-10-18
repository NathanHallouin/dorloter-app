/**
 * Migrateur de schéma : applique les fichiers `.sql` du dossier `migrations/`
 * au démarrage, dans l'ordre des versions (conventions Flyway `V<n>__<nom>.sql`).
 *
 * Compatibilité Flyway : sur une base déjà gérée par Flyway, on ne rejoue PAS les
 * versions déjà appliquées. La première exécution se « baseline » sur
 * `flyway_schema_history`, puis seules les migrations plus récentes sont jouées.
 * Sur une base vierge, tout est appliqué depuis V1.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Logger } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';

const SCHEMA = 'dorloter_api';

interface Migration {
  version: number;
  name: string;
  sql: string;
}

/**
 * Dossier des migrations. En dev on lit `apps/api/migrations` ; en production le
 * build copie les `.sql` à côté du bundle (`dist/migrations`).
 */
export function migrationsDirectory(): string {
  const candidates = [
    join(__dirname, '..', '..', '..', 'migrations'),
    join(__dirname, '..', '..', 'migrations'),
    join(process.cwd(), 'migrations'),
  ];
  const found = candidates.find((dir) => existsSync(dir));
  if (!found) throw new Error('Dossier de migrations introuvable.');
  return found;
}

/** Applique les migrations en attente. Renvoie le nombre de migrations jouées. */
export async function migrate(pool: Pool, logger = new Logger('Migrator')): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query(
      `CREATE SCHEMA IF NOT EXISTS ${SCHEMA}; SET search_path TO ${SCHEMA}, public;`,
    );
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${SCHEMA}.schema_migrations (
         version    integer PRIMARY KEY,
         name       text NOT NULL,
         applied_at timestamptz NOT NULL DEFAULT now())`,
    );

    let applied = await appliedVersions(client);
    if (applied.size === 0) {
      applied = await baselineFromFlyway(client, logger);
    }

    const pending = loadMigrations()
      .filter((m) => !applied.has(m.version))
      .sort((a, b) => a.version - b.version);

    for (const migration of pending) {
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO ${SCHEMA}.schema_migrations (version, name) VALUES ($1, $2)`,
          [migration.version, migration.name],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      logger.log(`migration appliquée : ${migration.name}`);
    }

    if (pending.length > 0) logger.log(`${pending.length} migration(s) appliquée(s)`);
    return pending.length;
  } finally {
    client.release();
  }
}

async function appliedVersions(client: PoolClient): Promise<Set<number>> {
  const result = await client.query<{ version: number }>(
    `SELECT version FROM ${SCHEMA}.schema_migrations`,
  );
  return new Set(result.rows.map((row) => Number(row.version)));
}

/** Marque comme appliquées les versions déjà jouées par Flyway (sans les rejouer). */
async function baselineFromFlyway(client: PoolClient, logger: Logger): Promise<Set<number>> {
  const exists = await client.query<{ table: string | null }>(
    `SELECT to_regclass('${SCHEMA}.flyway_schema_history')::text AS table`,
  );
  if (!exists.rows[0]?.table) return new Set();

  await client.query(
    `INSERT INTO ${SCHEMA}.schema_migrations (version, name)
     SELECT version::int, description FROM ${SCHEMA}.flyway_schema_history
     WHERE success AND version ~ '^[0-9]+$' ON CONFLICT (version) DO NOTHING`,
  );
  const baselined = await appliedVersions(client);
  logger.log(`baseline Flyway reconnue : ${baselined.size} version(s)`);
  return baselined;
}

function loadMigrations(): Migration[] {
  const directory = migrationsDirectory();
  const migrations: Migration[] = [];
  for (const file of readdirSync(directory)) {
    if (!file.endsWith('.sql')) continue;
    const parsed = parseName(file);
    if (!parsed) continue;
    migrations.push({ ...parsed, sql: readFileSync(join(directory, file), 'utf8') });
  }
  return migrations;
}

/** `V12__pension_bookings.sql` -> `{ version: 12, name: 'V12__pension_bookings' }`. */
function parseName(file: string): { version: number; name: string } | null {
  const match = /^V(\d+)__(.+)\.sql$/.exec(file);
  if (!match?.[1]) return null;
  return { version: Number.parseInt(match[1], 10), name: file.slice(0, -'.sql'.length) };
}
