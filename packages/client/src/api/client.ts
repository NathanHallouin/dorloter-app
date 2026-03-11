/**
 * Client HTTP de l'API Dorloter (NestJS, `/api/v1`).
 *
 * - Injecte `Authorization: Bearer <access>` quand un token est présent.
 * - Sur 401, tente UNE fois un refresh (dédupliqué entre requêtes concurrentes)
 *   puis rejoue la requête. Si le refresh échoue, vide les tokens.
 * - Parse l'enveloppe d'erreur `{ error: { code, message } }` en `ApiClientError`.
 */

import type { ApiErrorBody, ApiResponse, AuthTokens } from "./types";
import { tokenStore } from "./tokenStore";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** false = requête publique, ne pas attacher le token ni tenter de refresh. */
  auth?: boolean;
}

function url(path: string): string {
  return `${BASE_URL}${path}`;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return false;

  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(url("/api/v1/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          tokenStore.clear();
          return false;
        }
        const json = (await res.json()) as ApiResponse<AuthTokens>;
        tokenStore.set(json.data.accessToken, json.data.refreshToken);
        return true;
      } catch {
        tokenStore.clear();
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

async function request<T>(
  path: string,
  opts: RequestOptions = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const access = tokenStore.getAccess();
  if (opts.auth !== false && access) {
    headers["Authorization"] = `Bearer ${access}`;
  }

  const res = await fetch(url(path), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });

  if (
    res.status === 401 &&
    retry &&
    opts.auth !== false &&
    tokenStore.getRefresh()
  ) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, opts, false);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const body = json as Partial<ApiErrorBody> | null;
    const code = body?.error?.code ?? `HTTP_${res.status}`;
    const message =
      body?.error?.message ?? "Une erreur réseau est survenue. Réessayez.";
    throw new ApiClientError(message, code, res.status, body?.error?.details);
  }

  return json as T;
}

export const api = {
  get: <T>(path: string, auth?: boolean) => request<T>(path, { method: "GET", auth }),
  post: <T>(path: string, body?: unknown, auth?: boolean) =>
    request<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: unknown, auth?: boolean) =>
    request<T>(path, { method: "PUT", body, auth }),
  patch: <T>(path: string, body?: unknown, auth?: boolean) =>
    request<T>(path, { method: "PATCH", body, auth }),
  del: <T>(path: string, auth?: boolean) =>
    request<T>(path, { method: "DELETE", auth }),
};
