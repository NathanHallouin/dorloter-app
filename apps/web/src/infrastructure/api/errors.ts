/**
 * Erreurs de domaine — partagées par les Server Actions et les routes API.
 *
 * Pourquoi une exception (et pas un `Result<T>`) :
 *   - les services restent linéaires : `const pet = await getPet(id)`
 *     plutôt que `if (res.ok) ...`
 *   - les Server Actions catch et formatent en `ActionResponse`
 *   - les routes API catch et formatent en JSON HTTP
 *   - la stack-trace native facilite le debug et l'instrumentation
 *
 * Toute erreur "métier" (entité introuvable, permission refusée, validation
 * KO, conflit) doit être une `DomainError`. Les exceptions non-typées qui
 * remontent jusqu'au handler API sont automatiquement converties en
 * `INTERNAL_ERROR` (500) avec log.
 */

/** Codes d'erreur stables — exposés au client mobile. Ne JAMAIS renommer. */
export const ERROR_CODES = [
  // 400
  "VALIDATION_FAILED",
  "BAD_REQUEST",
  "INVALID_PARAM",

  // 401 / 403
  "UNAUTHORIZED",
  "FORBIDDEN",

  // 404
  "NOT_FOUND",

  // 409
  "CONFLICT",
  "DUPLICATE",

  // 410
  "GONE",

  // 422
  "UNPROCESSABLE",

  // 429
  "RATE_LIMITED",

  // 500 / 503
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  BAD_REQUEST: 400,
  INVALID_PARAM: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  DUPLICATE: 409,
  GONE: 410,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

// ─── Constructeurs courants ────────────────────────────────────────────────

export const notFound = (entity: string, id?: string) =>
  new DomainError(
    "NOT_FOUND",
    id ? `${entity} ${id} introuvable.` : `${entity} introuvable.`,
    id ? { entity, id } : { entity }
  );

export const unauthorized = (message = "Authentification requise.") =>
  new DomainError("UNAUTHORIZED", message);

export const forbidden = (message = "Action non autorisée.") =>
  new DomainError("FORBIDDEN", message);

export const validationFailed = (
  message: string,
  details?: Record<string, unknown>
) => new DomainError("VALIDATION_FAILED", message, details);

export const conflict = (message: string, details?: Record<string, unknown>) =>
  new DomainError("CONFLICT", message, details);

export const gone = (message: string, details?: Record<string, unknown>) =>
  new DomainError("GONE", message, details);

export const unprocessable = (
  message: string,
  details?: Record<string, unknown>
) => new DomainError("UNPROCESSABLE", message, details);

export const rateLimited = (retryAfterSec: number) =>
  new DomainError("RATE_LIMITED", "Trop de requêtes — réessayez plus tard.", {
    retryAfterSec,
  });
