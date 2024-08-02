"use server";

import { revalidatePath } from "next/cache";
import { db } from "@infra/db";
import { applications, pets } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentSession } from "@infra/auth/session";
import { applicationFormSchema } from "@adoption/validation-application";
import { publish } from "@infra/event-bus";
import type { ApplicationStatusChangedEvent } from "../events";
import { consumeRateLimit } from "@infra/rate-limit";
import type { ActionResponse } from "@/types";

export async function createApplication(
  formData: FormData
): Promise<ActionResponse<{ id: string }>> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Non autorisé" };

  const rate = await consumeRateLimit({
    key: "application:create",
    limit: 10,
    windowSec: 3600,
  });
  if (!rate.ok) {
    return {
      success: false,
      error: `Trop de candidatures récentes. Réessayez plus tard.`,
    };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = applicationFormSchema.safeParse({
    ...raw,
    hasOutdoorAccess: raw.hasOutdoorAccess === "on",
    hasChildren: raw.hasChildren === "on",
  });

  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }
  const data = parsed.data;

  // Vérifier que le chat existe et est adoptable
  const [pet] = await db
    .select({ status: pets.status })
    .from(pets)
    .where(eq(pets.id, data.petId))
    .limit(1);

  if (!pet) return { success: false, error: "Animal introuvable." };
  if (pet.status !== "disponible") {
    return { success: false, error: "Ce chat n'est plus disponible." };
  }

  // Empêcher les doublons actifs du même user pour le même chat
  const [existing] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.petId, data.petId),
        eq(applications.userId, session.user.id)
      )
    )
    .limit(1);

  if (existing) {
    return {
      success: false,
      error: "Vous avez déjà candidaté pour ce chat.",
    };
  }

  const [inserted] = await db
    .insert(applications)
    .values({
      petId: data.petId,
      userId: session.user.id,
      housingType: data.housingType,
      hasOutdoorAccess: data.hasOutdoorAccess,
      hasOtherPets: data.hasOtherPets,
      hasChildren: data.hasChildren,
      childrenAges: data.childrenAges,
      experience: data.experience,
      motivation: data.motivation,
      availability: data.availability,
    })
    .returning({ id: applications.id });

  revalidatePath("/candidatures");
  revalidatePath("/shelter-candidatures");

  return { success: true, data: { id: inserted!.id } };
}

export async function cancelApplication(
  applicationId: string
): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Non autorisé" };

  const [existing] = await db
    .select({ userId: applications.userId, status: applications.status })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!existing || existing.userId !== session.user.id) {
    return { success: false, error: "Candidature introuvable." };
  }

  if (existing.status === "acceptee" || existing.status === "refusee") {
    return { success: false, error: "Cette candidature ne peut plus être annulée." };
  }

  await db
    .update(applications)
    .set({ status: "annulee", updatedAt: new Date() })
    .where(eq(applications.id, applicationId));

  revalidatePath("/candidatures");

  return { success: true };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "en_cours" | "acceptee" | "refusee",
  shelterNotes?: string
): Promise<ActionResponse> {
  const session = await getCurrentSession();
  if (
    !session ||
    session.user.role !== "shelter_admin" ||
    !session.user.shelterId
  ) {
    return { success: false, error: "Non autorisé" };
  }

  // Vérifier que la candidature concerne un chat du refuge
  const [row] = await db
    .select({
      applicationId: applications.id,
      petId: applications.petId,
      applicantUserId: applications.userId,
      petName: pets.name,
      shelterId: pets.shelterId,
    })
    .from(applications)
    .innerJoin(pets, eq(pets.id, applications.petId))
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!row || row.shelterId !== session.user.shelterId) {
    return { success: false, error: "Candidature introuvable." };
  }

  await db
    .update(applications)
    .set({
      status,
      shelterNotes: shelterNotes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId));

  // Si acceptée : marquer le chat comme réservé
  if (status === "acceptee") {
    await db
      .update(pets)
      .set({ status: "reserve", updatedAt: new Date() })
      .where(eq(pets.id, row.petId));
  }

  // Publier l'event — notifications écoute pour fanout email/push/in-app.
  publish<ApplicationStatusChangedEvent>({
    type: "adoption.application_status_changed",
    applicationId,
    petId: row.petId,
    petName: row.petName,
    applicantUserId: row.applicantUserId,
    status,
    shelterNotes: shelterNotes ?? null,
  });

  revalidatePath("/shelter-candidatures");
  revalidatePath("/candidatures");

  return { success: true };
}
