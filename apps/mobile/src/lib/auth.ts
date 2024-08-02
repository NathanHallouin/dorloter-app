/**
 * Persistance du bearer token Better Auth — expo-secure-store.
 *
 * SecureStore utilise :
 *   - iOS : Keychain (chiffré, lié à l'app, optionnellement biometric)
 *   - Android : EncryptedSharedPreferences (AES-256, par-app)
 *
 * Le token reste en clé `session_token` ; on ne stocke rien d'autre
 * sensible. Le `device_token_id` (registre push) y est aussi gardé
 * pour pouvoir DELETE /devices/{id} au logout.
 */

import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "session_token";
const DEVICE_TOKEN_ID_KEY = "device_token_id";

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
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
