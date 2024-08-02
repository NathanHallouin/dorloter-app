/**
 * Client API Dorloter — wrapper fetch typé.
 *
 * Source unique de vérité : `types.gen.ts` est généré depuis l'OpenAPI
 * (cf. `scripts/generate-api-types.ts`). Régénérer après chaque change
 * sur les routes : `bun api:types`.
 *
 * Conçu pour être consommé identiquement par :
 *   - le web (tests, scripts internes, server-side fetch)
 *   - le mobile (Expo) — pas de dépendance Next.js / DOM
 *
 * Usage :
 *   const api = createApiClient({
 *     baseUrl: "https://dorloter.fr/api/v1",
 *     getAuthToken: () => SecureStore.getItemAsync("session_token"),
 *   });
 *
 *   const { data, error } = await api.GET("/pets", {
 *     params: { query: { species: "chat", limit: 20 } },
 *   });
 */

import createClient, { type Middleware, type Client } from "openapi-fetch";
import type { components, paths } from "./types.gen";

export type ApiPaths = paths;
export type ApiSchemas = components["schemas"];
export type ApiError = ApiSchemas["ApiError"]["error"];
export type ErrorCode = ApiError["code"];

export interface ApiClientOptions {
  /**
   * URL de base de l'API (sans trailing slash). Ex. en prod :
   * `https://dorloter.fr/api/v1`. En dev local : `http://localhost:3000/api/v1`.
   */
  baseUrl: string;
  /**
   * Récupère le bearer token (mobile). Web → undefined, le cookie de session
   * est envoyé automatiquement avec `credentials: "include"`.
   */
  getAuthToken?: () => string | null | Promise<string | null>;
  /**
   * Si true, envoie les cookies sur chaque requête (web auth).
   * Par défaut false : le mobile ne veut pas de cookies.
   */
  withCredentials?: boolean;
  /**
   * Surcharge `fetch` (utile pour les tests : msw, undici, etc.).
   * Par défaut le `globalThis.fetch`.
   */
  fetch?: typeof fetch;
}

export type DorloterClient = Client<ApiPaths>;

export function createApiClient(options: ApiClientOptions): DorloterClient {
  const { baseUrl, getAuthToken, withCredentials, fetch } = options;

  const client = createClient<ApiPaths>({
    baseUrl,
    fetch,
    credentials: withCredentials ? "include" : "same-origin",
  });

  if (getAuthToken) {
    const authMiddleware: Middleware = {
      async onRequest({ request }) {
        const token = await getAuthToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
        return request;
      },
    };
    client.use(authMiddleware);
  }

  return client;
}

/**
 * Type guard utile côté consommateur :
 *
 *   const { data, error } = await api.GET("/me");
 *   if (isApiError(error)) console.error(error.code);
 */
export function isApiError(value: unknown): value is { error: ApiError } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "object"
  );
}
