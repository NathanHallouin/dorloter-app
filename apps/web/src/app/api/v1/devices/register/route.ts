/**
 * POST /api/v1/devices/register
 *
 * Enregistre (ou rafraîchit) un Expo push token pour l'utilisateur
 * connecté. Idempotent : ré-appel avec le même `(userId, token)` met à
 * jour `last_seen_at` au lieu de dupliquer.
 *
 * Auth requise. Rate-limit léger (un user peut renouveler plusieurs fois
 * par jour : reinstall, OS update, switch device).
 */

import { z } from "zod";
import { withApi, apiCreated } from "@infra/api";
import { registerDeviceService } from "@notifications/public";
import { toDeviceTokenDto } from "@/app/api/v1/_dtos/device";

const bodySchema = z.object({
  expoPushToken: z
    .string()
    .min(20)
    .max(200)
    .regex(
      /^Expo(?:nentP)?ushToken\[[^\]]+\]$/,
      "Format Expo push token attendu : `ExponentPushToken[...]` ou `ExpoPushToken[...]`."
    ),
  platform: z.enum(["ios", "android"]),
  deviceName: z.string().max(255).optional().nullable(),
});

export const POST = withApi(
  {
    authRequired: true,
    bodySchema,
    rateLimit: { key: "api:devices:register", limit: 30, windowSec: 3600 },
  },
  async ({ body, session, requestId }) => {
    const token = await registerDeviceService(session!.user.id, body);
    return apiCreated(toDeviceTokenDto(token), { requestId });
  }
);
