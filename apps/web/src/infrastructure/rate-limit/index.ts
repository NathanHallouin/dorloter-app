import { headers } from "next/headers";

/**
 * Rate limit in-memory très simple. Acceptable pour un MVP mono-instance.
 * En prod multi-instance, remplacer par Redis (Upstash, Valkey…).
 */
interface Entry {
  count: number;
  resetAt: number;
}

const BUCKETS = new Map<string, Entry>();

export interface RateLimitConfig {
  /** Identifiant de l'action (ex. "report:create", "auth:signin"). */
  key: string;
  /** Nombre max de requêtes par fenêtre. */
  limit: number;
  /** Fenêtre en secondes. */
  windowSec: number;
}

/**
 * Consomme un token pour l'identité courante (IP). Renvoie `{ok:true}` si
 * OK, ou `{ok:false, retryAfter}` si limite atteinte.
 */
export async function consumeRateLimit(config: RateLimitConfig): Promise<
  | { ok: true }
  | { ok: false; retryAfter: number }
> {
  const identity = await clientIdentity();
  const bucketKey = `${config.key}:${identity}`;
  const now = Date.now();

  const entry = BUCKETS.get(bucketKey);
  if (!entry || entry.resetAt < now) {
    BUCKETS.set(bucketKey, {
      count: 1,
      resetAt: now + config.windowSec * 1000,
    });
    return { ok: true };
  }

  if (entry.count >= config.limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true };
}

async function clientIdentity(): Promise<string> {
  const h = await headers();
  // x-forwarded-for (proxy) → fallback x-real-ip → fallback "local"
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real;
  return "local";
}

// Nettoyage périodique (une fois par heure) pour éviter la croissance
// mémoire sur long-runs en dev. En prod avec Redis, TTL natif.
if (typeof globalThis !== "undefined" && !("__miaou_rate_cleanup" in globalThis)) {
  // @ts-expect-error flag sur globalThis
  globalThis.__miaou_rate_cleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of BUCKETS) {
      if (v.resetAt < now) BUCKETS.delete(k);
    }
  }, 60 * 60 * 1000);
}
