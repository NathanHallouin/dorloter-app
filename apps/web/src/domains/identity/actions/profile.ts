"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@infra/db";
import { users } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@infra/auth/session";
import type { ActionResponse } from "@/types";

const profileSchema = z.object({
  name: z.string().min(1, "Nom requis").max(255),
  phone: z.string().max(20).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notificationRadiusKm: z.number().int().min(1).max(50).optional(),
});

export async function updateProfile(
  formData: FormData
): Promise<ActionResponse> {
  const session = await requireAuth();

  const raw = Object.fromEntries(formData.entries());
  const parsed = profileSchema.safeParse({
    name: raw.name,
    phone: raw.phone || undefined,
    latitude: raw.latitude ? Number(raw.latitude) : undefined,
    longitude: raw.longitude ? Number(raw.longitude) : undefined,
    notificationRadiusKm: raw.notificationRadiusKm
      ? Number(raw.notificationRadiusKm)
      : undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }
  const data = parsed.data;

  const hasLocation =
    data.latitude !== undefined && data.longitude !== undefined;

  await db
    .update(users)
    .set({
      name: data.name,
      phone: data.phone ?? null,
      location: hasLocation
        ? (sql`ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)` as never)
        : null,
      notificationRadiusKm: data.notificationRadiusKm ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  revalidatePath("/profil");

  return { success: true };
}

/**
 * Suppression de compte (RGPD). Les données associées sont purgées via
 * ON DELETE CASCADE sur les FK : sessions, accounts, favorites, reports,
 * applications, notifications.
 */
export async function deleteAccount(): Promise<ActionResponse> {
  const session = await requireAuth();
  await db.delete(users).where(eq(users.id, session.user.id));
  return { success: true };
}
