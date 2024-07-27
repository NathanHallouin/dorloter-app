/**
 * Wrapper standardisé pour les routes `/api/v1/*`.
 *
 * Responsabilités :
 *   1. Génère / propage l'`X-Request-Id` (tracing)
 *   2. Récupère la session Better Auth (cookie OU bearer)
 *   3. Valide les paramètres avec Zod
 *   4. Applique un rate-limit optionnel par clé logique
 *   5. Catche les `DomainError` (les transforme en JSON HTTP propre)
 *   6. Catche les exceptions inconnues (log + 500 sans fuite)
 *
 * Toute la couche au-dessus (le handler du domaine) écrit du code linéaire :
 * il throw `notFound()` / `forbidden()` / `validationFailed()` au lieu de
 * formater des Response à la main.
 */

import type { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { auth, type Session } from "@infra/auth/auth";
import { consumeRateLimit } from "@infra/rate-limit";
import { logEvent } from "@infra/logger";
import { DomainError, unauthorized, validationFailed, rateLimited } from "./errors";
import { apiError, apiInternalError } from "./responses";

// ─── Contexte exposé aux handlers ─────────────────────────────────────────

export interface ApiContext<TParams = unknown, TQuery = unknown, TBody = unknown> {
  request: NextRequest;
  /** ID de requête — toujours présent. À propager dans les logs. */
  requestId: string;
  /** Session Better Auth, présente uniquement si `authRequired` ou si l'user est connecté. */
  session: Session | null;
  /** Paramètres de route validés. */
  params: TParams;
  /** Query string validée. */
  query: TQuery;
  /** Body JSON validé (uniquement si une schema est définie). */
  body: TBody;
}

// ─── Options du wrapper ────────────────────────────────────────────────────

export interface ApiHandlerOptions<TParams, TQuery, TBody> {
  /** Schema Zod pour les paramètres de route (`/pets/[id]` → `{ id: string }`). */
  paramsSchema?: ZodSchema<TParams>;
  /** Schema Zod pour la query string. */
  querySchema?: ZodSchema<TQuery>;
  /** Schema Zod pour le body JSON. */
  bodySchema?: ZodSchema<TBody>;
  /**
   * Si true, exige une session valide — sinon throw `unauthorized()`
   * avant d'appeler le handler. Par défaut false (route publique).
   */
  authRequired?: boolean;
  /**
   * Rate-limit par clé logique. La clé est suffixée par l'IP côté
   * `consumeRateLimit`.
   */
  rateLimit?: {
    key: string;
    limit: number;
    windowSec: number;
  };
}

type Handler<TParams, TQuery, TBody> = (
  ctx: ApiContext<TParams, TQuery, TBody>
) => Promise<NextResponse> | NextResponse;

// ─── withApi : adapte un Handler à la signature Next.js ──────────────────

type RouteContext<TParams> = {
  params: Promise<TParams> | TParams;
};

export function withApi<
  TParams = Record<string, never>,
  TQuery = Record<string, never>,
  TBody = Record<string, never>,
>(
  options: ApiHandlerOptions<TParams, TQuery, TBody>,
  handler: Handler<TParams, TQuery, TBody>
) {
  return async (
    request: NextRequest,
    routeCtx?: RouteContext<TParams>
  ): Promise<NextResponse> => {
    const requestId =
      request.headers.get("x-request-id") ?? generateRequestId();

    try {
      // ─── Rate-limit ───
      if (options.rateLimit) {
        const rl = await consumeRateLimit({
          key: options.rateLimit.key,
          limit: options.rateLimit.limit,
          windowSec: options.rateLimit.windowSec,
        });
        if (!rl.ok) {
          throw rateLimited(rl.retryAfter);
        }
      }

      // ─── Auth ───
      const session = await auth.api
        .getSession({ headers: request.headers })
        .catch(() => null);

      if (options.authRequired && !session) {
        throw unauthorized();
      }

      // ─── Params ───
      const rawParams =
        routeCtx?.params instanceof Promise
          ? await routeCtx.params
          : (routeCtx?.params ?? {});
      const params = options.paramsSchema
        ? safeParse(options.paramsSchema, rawParams, "params")
        : (rawParams as TParams);

      // ─── Query ───
      const url = new URL(request.url);
      const rawQuery = Object.fromEntries(url.searchParams.entries());
      const query = options.querySchema
        ? safeParse(options.querySchema, rawQuery, "query")
        : (rawQuery as unknown as TQuery);

      // ─── Body (uniquement si schema, et methods write) ───
      let body: TBody = {} as TBody;
      if (options.bodySchema) {
        const raw = await request
          .json()
          .catch(() => {
            throw validationFailed("Body JSON invalide ou manquant.");
          });
        body = safeParse(options.bodySchema, raw, "body");
      }

      const response = await handler({
        request,
        requestId,
        session: session as Session | null,
        params,
        query,
        body,
      });

      // Toujours propager le requestId — Next.js cumule les headers.
      response.headers.set("X-Request-Id", requestId);
      return response;
    } catch (err) {
      if (err instanceof DomainError) {
        return apiError(err, { requestId });
      }
      // Exception non-typée : log + 500 sans fuite
      logEvent(
        "api.unhandled_error",
        {
          path: new URL(request.url).pathname,
          method: request.method,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        },
        { level: "error" }
      );
      return apiInternalError({ requestId });
    }
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function safeParse<T>(schema: ZodSchema<T>, raw: unknown, where: string): T {
  const res = schema.safeParse(raw);
  if (!res.success) {
    throw zodToValidationError(res.error, where);
  }
  return res.data;
}

function zodToValidationError(error: ZodError, where: string): DomainError {
  const issues = error.issues.map((i) => ({
    path: i.path.join("."),
    code: i.code,
    message: i.message,
  }));
  return validationFailed(
    `Données ${where} invalides`,
    { issues }
  );
}

function generateRequestId(): string {
  // crypto.randomUUID() est dispo dans Node ≥ 19 et Edge Runtime
  return globalThis.crypto.randomUUID();
}
