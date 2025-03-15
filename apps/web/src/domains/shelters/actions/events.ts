"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { shelterEvents } from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import { EVENT_TYPES } from "../lib/event-types";
import type { ActionResponse } from "@/types";

const eventSchema = z
  .object({
    type: z.enum(EVENT_TYPES as readonly [string, ...string[]]),
    title: z.string().trim().min(2, "Titre trop court").max(255),
    description: z.string().max(5000).optional().or(z.literal("")),
    /** ISO 8601 datetime-local (`YYYY-MM-DDTHH:mm`). */
    startsAt: z.string().min(16),
    endsAt: z.string().optional().or(z.literal("")),
    venueAddress: z.string().max(500).optional().or(z.literal("")),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    externalUrl: z.string().url().optional().or(z.literal("")),
    isPublished: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (!data.endsAt) return true;
      const start = new Date(data.startsAt);
      const end = new Date(data.endsAt);
      return end.getTime() >= start.getTime();
    },
    { message: "La date de fin doit être après la date de début." }
  );

export type EventInput = z.infer<typeof eventSchema>;

export async function createShelterEvent(
  input: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await requireShelter();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;
  const hasLocation =
    data.latitude !== undefined && data.longitude !== undefined;

  const [created] = await db
    .insert(shelterEvents)
    .values({
      shelterId: session.user.shelterId,
      type: data.type as never,
      title: data.title,
      description: data.description || null,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      venueAddress: data.venueAddress || null,
      location: hasLocation
        ? (sql`ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)` as never)
        : null,
      externalUrl: data.externalUrl || null,
      isPublished: data.isPublished,
    })
    .returning({ id: shelterEvents.id });
  if (!created) {
    return { success: false, error: "Création impossible." };
  }
  revalidatePath("/shelter-evenements");
  revalidatePath("/evenements");
  return { success: true, data: { id: created.id } };
}

export async function updateShelterEvent(
  id: string,
  input: unknown
): Promise<ActionResponse> {
  const session = await requireShelter();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;
  const hasLocation =
    data.latitude !== undefined && data.longitude !== undefined;

  await db
    .update(shelterEvents)
    .set({
      type: data.type as never,
      title: data.title,
      description: data.description || null,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      venueAddress: data.venueAddress || null,
      location: hasLocation
        ? (sql`ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)` as never)
        : null,
      externalUrl: data.externalUrl || null,
      isPublished: data.isPublished,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(shelterEvents.id, id),
        eq(shelterEvents.shelterId, session.user.shelterId)
      )
    );
  revalidatePath("/shelter-evenements");
  revalidatePath("/evenements");
  return { success: true };
}

export async function deleteShelterEvent(
  id: string
): Promise<ActionResponse> {
  const session = await requireShelter();
  await db
    .delete(shelterEvents)
    .where(
      and(
        eq(shelterEvents.id, id),
        eq(shelterEvents.shelterId, session.user.shelterId)
      )
    );
  revalidatePath("/shelter-evenements");
  revalidatePath("/evenements");
  return { success: true };
}
