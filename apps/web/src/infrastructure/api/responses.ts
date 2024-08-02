/**
 * Helpers de réponses HTTP pour `/api/v1/*`.
 *
 * Format de réponse stable :
 *   - Succès : `{ "data": <payload> }`
 *   - Liste paginée : `{ "data": [...], "pagination": { cursor, hasMore } }`
 *   - Erreur : `{ "error": { "code": "ERROR_CODE", "message": "...", "details"?: {} } }`
 *
 * Tous les helpers fixent `Content-Type: application/json; charset=utf-8`
 * et rajoutent l'`X-Request-Id` si le caller le passe (pour le tracing).
 */

import { NextResponse } from "next/server";
import { DomainError, type ErrorCode } from "./errors";

interface ResponseMeta {
  requestId?: string;
  /** Headers additionnels à propager (ex. Retry-After pour 429). */
  headers?: Record<string, string>;
}

export function apiOk<T>(data: T, meta: ResponseMeta = {}): NextResponse {
  return NextResponse.json(
    { data },
    {
      status: 200,
      headers: buildHeaders(meta),
    }
  );
}

export function apiCreated<T>(data: T, meta: ResponseMeta = {}): NextResponse {
  return NextResponse.json(
    { data },
    {
      status: 201,
      headers: buildHeaders(meta),
    }
  );
}

export function apiNoContent(meta: ResponseMeta = {}): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: buildHeaders(meta),
  });
}

export interface PaginationMeta {
  cursor: string | null;
  hasMore: boolean;
}

export function apiPaginated<T>(
  data: T[],
  pagination: PaginationMeta,
  meta: ResponseMeta = {}
): NextResponse {
  return NextResponse.json(
    { data, pagination },
    {
      status: 200,
      headers: buildHeaders(meta),
    }
  );
}

interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function apiError(err: DomainError, meta: ResponseMeta = {}): NextResponse {
  const body: ApiErrorBody = {
    error: {
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  };
  const headers = buildHeaders(meta);
  if (err.code === "RATE_LIMITED" && typeof err.details?.retryAfterSec === "number") {
    headers["Retry-After"] = String(err.details.retryAfterSec);
  }
  return NextResponse.json(body, {
    status: err.status,
    headers,
  });
}

/**
 * Erreur 500 générique — utilisée par le wrapper quand une exception
 * non-`DomainError` remonte. On ne renvoie jamais le message brut au
 * client (peut contenir des secrets ou des détails de stack).
 */
export function apiInternalError(meta: ResponseMeta = {}): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR" as ErrorCode,
        message:
          "Erreur interne. Réessayez dans quelques instants — si ça persiste, contactez-nous.",
      },
    },
    {
      status: 500,
      headers: buildHeaders(meta),
    }
  );
}

function buildHeaders(meta: ResponseMeta): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
  };
  if (meta.requestId) headers["X-Request-Id"] = meta.requestId;
  if (meta.headers) Object.assign(headers, meta.headers);
  return headers;
}
