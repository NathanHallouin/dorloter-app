/**
 * Service devices — gestion des Expo push tokens enregistrés par les
 * apps mobile.
 *
 * - `registerDevice` est upsert : un même device qui réenregistre son
 *   token (relogin, mise à jour OS, install/réinstall) ne crée pas de
 *   doublon ; on update juste `last_seen_at`.
 * - `unregisterDevice` est idempotent : suppression ciblée si trouvé,
 *   no-op sinon.
 * - `getActiveTokensForUser` retourne les tokens à utiliser au fanout.
 *   Pas de "TTL" — on supprime un token uniquement quand Expo Push
 *   répond `DeviceNotRegistered` (cf. listener fanout).
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { notFound, validationFailed } from "@infra/api/errors";
import { deviceTokens } from "@/server/db/schema";

export type DevicePlatform = "ios" | "android";

export interface DeviceToken {
  id: string;
  userId: string;
  expoPushToken: string;
  platform: DevicePlatform;
  deviceName: string | null;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface RegisterDeviceInput {
  expoPushToken: string;
  platform: DevicePlatform;
  deviceName?: string | null;
}

const EXPO_TOKEN_RE = /^Expo(?:nentP)?ushToken\[[^\]]+\]$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enregistre (ou rafraîchit) un Expo push token pour l'utilisateur.
 *
 * Throws :
 *   - `validationFailed` si le token n'a pas le format attendu
 */
export async function registerDevice(
  userId: string,
  input: RegisterDeviceInput
): Promise<DeviceToken> {
  if (!EXPO_TOKEN_RE.test(input.expoPushToken)) {
    throw validationFailed(
      "Token Expo invalide. Attendu : `ExponentPushToken[...]` ou `ExpoPushToken[...]`."
    );
  }

  const [row] = await db
    .insert(deviceTokens)
    .values({
      userId,
      expoPushToken: input.expoPushToken,
      platform: input.platform,
      deviceName: input.deviceName ?? null,
    })
    .onConflictDoUpdate({
      target: [deviceTokens.userId, deviceTokens.expoPushToken],
      set: {
        platform: input.platform,
        deviceName: input.deviceName ?? null,
        lastSeenAt: sql`now()`,
      },
    })
    .returning();

  return toDeviceToken(row!);
}

/**
 * Supprime un device token donné par son id. Refuse si l'id n'appartient
 * pas à l'utilisateur courant — pour éviter qu'un user rafraîchisse les
 * tokens d'un autre.
 */
export async function unregisterDevice(
  userId: string,
  deviceTokenId: string
): Promise<void> {
  if (!UUID_RE.test(deviceTokenId)) {
    throw validationFailed("ID device invalide.");
  }
  const result = await db
    .delete(deviceTokens)
    .where(
      and(eq(deviceTokens.id, deviceTokenId), eq(deviceTokens.userId, userId))
    )
    .returning({ id: deviceTokens.id });

  if (result.length === 0) {
    throw notFound("Device", deviceTokenId);
  }
}

export async function getActiveTokensForUser(
  userId: string
): Promise<DeviceToken[]> {
  const rows = await db
    .select()
    .from(deviceTokens)
    .where(eq(deviceTokens.userId, userId));
  return rows.map(toDeviceToken);
}

/**
 * Supprime en masse les tokens devenus invalides (signalés comme tels par
 * Expo Push API au moment du fanout). Appelé par le listener pour
 * nettoyer la base sans avoir à relancer la requête à chaque envoi.
 */
export async function deleteTokensByValue(
  expoPushTokens: string[]
): Promise<void> {
  if (expoPushTokens.length === 0) return;
  await db
    .delete(deviceTokens)
    .where(inArray(deviceTokens.expoPushToken, expoPushTokens));
}

function toDeviceToken(row: typeof deviceTokens.$inferSelect): DeviceToken {
  return {
    id: row.id,
    userId: row.userId,
    expoPushToken: row.expoPushToken,
    platform: row.platform,
    deviceName: row.deviceName,
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
  };
}
