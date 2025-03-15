"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@infra/db";
import { applications, petMedicalEvents, pets } from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import { MEDICAL_EVENT_TYPES } from "../lib/medical-event-types";
import type { ActionResponse } from "@/types";

const eventSchema = z.object({
  petId: z.string().uuid(),
  type: z.enum(MEDICAL_EVENT_TYPES as readonly [string, ...string[]]),
  title: z.string().trim().min(2, "Titre trop court").max(255),
  notes: z.string().max(2000).optional(),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (YYYY-MM-DD)"),
  nextReminderAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (YYYY-MM-DD)")
    .optional()
    .or(z.literal("")),
  vetNameFreeform: z.string().max(255).optional(),
});

export type MedicalEventInput = z.infer<typeof eventSchema>;

/**
 * Le carnet médical peut être édité par :
 *   - le shelter admin du refuge propriétaire (animal encore au refuge)
 *   - l'adoptant ayant une candidature `acceptee` sur cet animal
 *     (continuation post-adoption)
 *
 * Retourne le rôle reconnu pour invalider la bonne route + tagger l'origine
 * de la modification si on en a besoin plus tard.
 */
async function assertWriteAccess(
  petId: string,
  userRole: string,
  userShelterId: string | null,
  userId: string
): Promise<"shelter" | "adopter" | null> {
  const [pet] = await db
    .select({ shelterId: pets.shelterId })
    .from(pets)
    .where(eq(pets.id, petId))
    .limit(1);
  if (!pet) return null;

  if (
    userRole === "shelter_admin" &&
    userShelterId &&
    pet.shelterId === userShelterId
  ) {
    return "shelter";
  }

  const [app] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.petId, petId),
        eq(applications.userId, userId),
        eq(applications.status, "acceptee")
      )
    )
    .limit(1);
  if (app) return "adopter";

  return null;
}

function revalidateRoutes(petId: string, role: "shelter" | "adopter") {
  if (role === "shelter") {
    revalidatePath(`/shelter-animaux/${petId}/sante`);
  } else {
    revalidatePath(`/mes-animaux/${petId}/sante`);
    revalidatePath(`/mes-animaux`);
  }
}

export async function createMedicalEvent(
  input: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await requireAuth();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;
  const role = await assertWriteAccess(
    data.petId,
    session.user.role,
    session.user.shelterId ?? null,
    session.user.id
  );
  if (!role) return { success: false, error: "Animal introuvable." };

  const [created] = await db
    .insert(petMedicalEvents)
    .values({
      petId: data.petId,
      type: data.type as never,
      title: data.title,
      notes: data.notes || null,
      eventDate: data.eventDate,
      nextReminderAt: data.nextReminderAt || null,
      vetNameFreeform: data.vetNameFreeform || null,
    })
    .returning({ id: petMedicalEvents.id });
  if (!created) {
    return { success: false, error: "Création impossible." };
  }
  revalidateRoutes(data.petId, role);
  return { success: true, data: { id: created.id } };
}

export async function updateMedicalEvent(
  id: string,
  input: unknown
): Promise<ActionResponse> {
  const session = await requireAuth();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;
  const role = await assertWriteAccess(
    data.petId,
    session.user.role,
    session.user.shelterId ?? null,
    session.user.id
  );
  if (!role) return { success: false, error: "Animal introuvable." };

  await db
    .update(petMedicalEvents)
    .set({
      type: data.type as never,
      title: data.title,
      notes: data.notes || null,
      eventDate: data.eventDate,
      nextReminderAt: data.nextReminderAt || null,
      vetNameFreeform: data.vetNameFreeform || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(petMedicalEvents.id, id),
        eq(petMedicalEvents.petId, data.petId)
      )
    );
  revalidateRoutes(data.petId, role);
  return { success: true };
}

export async function deleteMedicalEvent(
  id: string,
  petId: string
): Promise<ActionResponse> {
  const session = await requireAuth();
  const role = await assertWriteAccess(
    petId,
    session.user.role,
    session.user.shelterId ?? null,
    session.user.id
  );
  if (!role) return { success: false, error: "Non autorisé." };

  await db
    .delete(petMedicalEvents)
    .where(
      and(
        eq(petMedicalEvents.id, id),
        eq(petMedicalEvents.petId, petId)
      )
    );
  revalidateRoutes(petId, role);
  return { success: true };
}
