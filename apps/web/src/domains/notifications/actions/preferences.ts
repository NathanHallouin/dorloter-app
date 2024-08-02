"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@infra/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@infra/auth/session";
import type { ActionResponse } from "@/types";
import {
  NOTIFICATION_TYPES,
  type NotificationPreferences,
} from "../preferences";

const channelSchema = z.object({
  push: z.boolean(),
  email: z.boolean(),
});

const preferencesSchema = z.object(
  Object.fromEntries(
    NOTIFICATION_TYPES.map((t) => [t, channelSchema])
  ) as Record<(typeof NOTIFICATION_TYPES)[number], typeof channelSchema>
);

export async function updateNotificationPreferences(
  prefs: NotificationPreferences
): Promise<ActionResponse> {
  const session = await requireAuth();

  const parsed = preferencesSchema.safeParse(prefs);
  if (!parsed.success) {
    return {
      success: false,
      error: "Préférences invalides.",
    };
  }

  await db
    .update(users)
    .set({ notificationPreferences: parsed.data, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  revalidatePath("/parametres/notifications");
  revalidatePath("/notifications");

  return { success: true };
}
