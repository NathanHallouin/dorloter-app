/**
 * Pool Postgres (Kysely + node-postgres) exposé comme provider Nest.
 *
 * Le `search_path` (schéma `dorloter_api`) est positionné à chaque connexion.
 * Les parseurs de types pg sont ajustés pour coller au contrat d'API :
 * `bigint` et `numeric` en nombres JSON, `date` en `yyyy-mm-dd`.
 */

import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types as pgTypes } from 'pg';

import { CONFIG, type Config, type DbConfig } from '../../config';
import type { Database } from './schema';

/** Jeton d'injection de l'instance Kysely. */
export const DB = Symbol('DORLOTER_DB');

/** Type injecté dans les services : `@Inject(DB) private readonly db: Db`. */
export type Db = Kysely<Database>;

// OID des types Postgres dont on veut changer la représentation JS.
const OID_INT8 = 20;
const OID_NUMERIC = 1700;
const OID_DATE = 1082;

/** `count(*)` et les `numeric` doivent arriver en nombres, pas en chaînes. */
pgTypes.setTypeParser(OID_INT8, (value) => (value === null ? null : Number(value)));
pgTypes.setTypeParser(OID_NUMERIC, (value) => (value === null ? null : Number(value)));
/** Une colonne `date` reste une date civile : pas de conversion en `Date` UTC. */
pgTypes.setTypeParser(OID_DATE, (value) => value);

export function createPool(cfg: DbConfig): Pool {
  const pool = new Pool({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.username,
    password: cfg.password,
    max: 10,
  });
  pool.on('connect', (client) => {
    void client.query(`SET search_path TO ${cfg.searchPath}`);
  });
  return pool;
}

export function createKysely(pool: Pool): Db {
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [CONFIG],
      useFactory: (config: Config): Db => createKysely(createPool(config.db)),
    },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DB) private readonly db: Db) {}

  async onApplicationShutdown(): Promise<void> {
    await this.db.destroy();
  }
}
