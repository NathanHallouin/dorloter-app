import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/server/db/schema";
import { relations } from "@/server/db/relations";

/**
 * Clients DB partagés via `globalThis` pour survivre aux rechargements HMR
 * de Next.js en dev. Sans ça, chaque sauvegarde de fichier recrée un pool
 * → fuite de connexions → `FATAL: remaining connection slots reserved`
 * au bout de 100 modifications.
 *
 * max: 10 par pool (app + admin = 20 max) — largement suffisant pour le MVP
 * et bien en deçà du `max_connections=100` de Postgres par défaut.
 *
 * `CACHE_VERSION` : bumper cette constante invalide les clients en cache
 * (utile quand on change une option postgres-js qui doit reprendre effet
 * sans redémarrer manuellement le process dev).
 */
const CACHE_VERSION = "v2-prepare-aware";

type GlobalCache = {
  __miaouAppPg?: { version: string; client: ReturnType<typeof postgres> };
  __miaouAdminPg?: { version: string; client: ReturnType<typeof postgres> };
};

const globalCache = globalThis as unknown as GlobalCache;

// Supabase transaction pooler (port 6543, pgbouncer transaction mode) ne
// supporte pas les prepared statements. postgres-js les utilise par défaut,
// ce qui casse les queries un peu complexes (FILTER WHERE, CTE, etc.) avec
// un opaque "Failed query". Désactiver `prepare` est la recommandation
// officielle Supabase pour ce pooler.
function isTransactionPooler(url: string): boolean {
  return /:6543\b/.test(url) || /pooler\.supabase/.test(url);
}

function getAppClient() {
  if (
    !globalCache.__miaouAppPg ||
    globalCache.__miaouAppPg.version !== CACHE_VERSION
  ) {
    if (globalCache.__miaouAppPg?.client) {
      globalCache.__miaouAppPg.client.end({ timeout: 1 }).catch(() => {});
    }
    const url = process.env.DATABASE_URL!;
    globalCache.__miaouAppPg = {
      version: CACHE_VERSION,
      client: postgres(url, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: !isTransactionPooler(url),
      }),
    };
  }
  return globalCache.__miaouAppPg.client;
}

function getAdminClient() {
  if (
    !globalCache.__miaouAdminPg ||
    globalCache.__miaouAdminPg.version !== CACHE_VERSION
  ) {
    if (globalCache.__miaouAdminPg?.client) {
      globalCache.__miaouAdminPg.client.end({ timeout: 1 }).catch(() => {});
    }
    const url = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL!;
    globalCache.__miaouAdminPg = {
      version: CACHE_VERSION,
      client: postgres(url, {
        max: 5,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: !isTransactionPooler(url),
      }),
    };
  }
  return globalCache.__miaouAdminPg.client;
}

/**
 * Connexion principale : rôle `miaou_app` en prod.
 * Dépourvue des privilèges sensibles (voir `scripts/init-db-roles.sql`) :
 * ne peut pas escalader `users.role`, toucher `shelters.is_verified`, ni
 * résoudre des `content_reports`. Utilisée par 99 % de l'app.
 */
export const db = drizzle({ client: getAppClient(), schema, relations });

/**
 * Connexion privilégiée : rôle `miaou_admin`. À n'utiliser QUE dans les
 * Server Actions protégées par `requirePlatformAdmin` ou pour les opérations
 * de confiance explicites (self-promotion shelter_admin au moment de la
 * création d'un refuge, accept d'invitation).
 *
 * En dev, si `DATABASE_URL_ADMIN` n'est pas défini, retombe sur `DATABASE_URL`
 * pour ne pas casser le seed script d'un nouveau clone. En prod : OBLIGATOIRE.
 */
export const adminDb = drizzle({ client: getAdminClient(), schema, relations });
