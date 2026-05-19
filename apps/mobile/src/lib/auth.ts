/**
 * Session mobile : jetons JWT persistés dans expo-secure-store.
 *
 * SecureStore utilise :
 *   - iOS : Keychain (chiffré, lié à l'app, optionnellement biometric)
 *   - Android : EncryptedSharedPreferences (AES-256, par-app)
 *
 * L'API émet un **access token court** (15 minutes) et un **refresh token
 * opaque** à rotation. Sans renouvellement, l'app se déconnecterait donc toutes
 * les quinze minutes : `getAuthToken` renouvelle de lui-même quand l'échéance
 * approche, ce qui rend le mécanisme transparent pour les écrans.
 *
 * Le `device_token_id` (registre push) est gardé ici aussi, pour pouvoir
 * appeler `DELETE /devices/{id}` à la déconnexion.
 */

import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "session_token";
const REFRESH_KEY = "refresh_token";
const EXPIRES_AT_KEY = "session_expires_at";
const DEVICE_TOKEN_ID_KEY = "device_token_id";

/** Marge avant expiration : on renouvelle un peu en avance. */
const REFRESH_MARGIN_MS = 60_000;

const apiBaseUrl =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  "http://localhost:8080/api/v1";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Durée de vie de l'access token, en secondes. */
  expiresIn: number;
}

/** Renouvellement en cours, partagé : évite N appels concurrents. */
let inFlightRefresh: Promise<string | null> | null = null;

export async function saveSession(tokens: AuthTokens): Promise<void> {
  const expiresAt = Date.now() + tokens.expiresIn * 1000;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
    SecureStore.setItemAsync(EXPIRES_AT_KEY, String(expiresAt)),
  ]);
}

/**
 * Access token utilisable immédiatement, renouvelé si nécessaire.
 * Renvoie `null` si aucune session valide ne peut être obtenue.
 */
export async function getAuthToken(): Promise<string | null> {
  const access = await SecureStore.getItemAsync(ACCESS_KEY);
  if (!access) return null;

  const rawExpiry = await SecureStore.getItemAsync(EXPIRES_AT_KEY);
  const expiresAt = rawExpiry ? Number(rawExpiry) : 0;
  if (expiresAt - REFRESH_MARGIN_MS > Date.now()) return access;

  // Échéance atteinte : un seul renouvellement, partagé par les appelants.
  inFlightRefresh ??= refreshSession().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

async function refreshSession(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      // Refresh révoqué ou expiré : la session est perdue, on repart propre.
      await clearSession();
      return null;
    }
    const body = (await response.json()) as { data: AuthTokens };
    await saveSession(body.data);
    return body.data.accessToken;
  } catch {
    // Réseau indisponible : on garde la session, l'appel échouera et sera
    // retenté plus tard plutôt que de déconnecter l'utilisateur à tort.
    return SecureStore.getItemAsync(ACCESS_KEY);
  }
}

/** Révoque le refresh token côté serveur, puis efface la session locale. */
export async function logout(): Promise<void> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (refreshToken) {
    try {
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Déconnexion locale quand même : l'utilisateur a demandé à sortir.
    }
  }
  await clearSession();
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(EXPIRES_AT_KEY),
  ]);
}

export async function getDeviceTokenId(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_TOKEN_ID_KEY);
}

export async function setDeviceTokenId(id: string): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_TOKEN_ID_KEY, id);
}

export async function clearDeviceTokenId(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_TOKEN_ID_KEY);
}
