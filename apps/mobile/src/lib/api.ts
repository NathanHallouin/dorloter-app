/**
 * Client API singleton — wrap @dorloter/api-client avec :
 *   - URL de base depuis app.config.ts (`extra.apiBaseUrl`)
 *   - bearer token lu depuis expo-secure-store à chaque requête
 *
 * Pas de cookie : RN ne gère pas naturellement les cookies de session
 * (et on a activé le bearer plugin Better Auth côté serveur exprès).
 */

import Constants from "expo-constants";
import { createApiClient } from "@dorloter/api-client";
import { getAuthToken } from "@/lib/auth";

const apiBaseUrl =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  "http://localhost:3000/api/v1";

export const api = createApiClient({
  baseUrl: apiBaseUrl,
  getAuthToken,
});
