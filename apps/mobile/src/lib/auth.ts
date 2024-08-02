/**
 * Persistance du bearer token Better Auth — expo-secure-store.
 *
 * SecureStore utilise :
 *   - iOS : Keychain (chiffré, lié à l'app, optionnellement biometric)
 *   - Android : EncryptedSharedPreferences (AES-256, par-app)
 *
 * Le token reste en clé `session_token` ; on ne stocke rien d'autre
 * (pas l'user, pas l'email) — la source de vérité reste le serveur via
 * `GET /api/v1/me`.
 */

import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "session_token";

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
