"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@infra/db";
import {
  fosterFamilies,
  petFosterPlacements,
  pets,
  users,
} from "@/server/db/schema";
import { requireAuth, requireShelter } from "@infra/auth/session";
import {
  sendEmail,
  fosterFamilyCandidatureEmailTemplate,
  fosterFamilyDecidedEmailTemplate,
} from "@infra/email";
import type { ActionResponse } from "@/types";

const applySchema = z.object({
  shelterId: z.string().uuid(),
  motivation: z.string().trim().min(50, "Décris ta motivation (50 caractères min)").max(2000),
  acceptsCats: z.boolean().default(true),
  acceptsDogs: z.boolean().default(true),
  maxCapacity: z.number().int().min(1).max(20).default(1),
  hasGarden: z.boolean().default(false),
  hasOtherPets: z.boolean().default(false),
  otherPetsDescription: z.string().trim().max(500).optional().or(z.literal("")),
  hasChildren: z.boolean().default(false),
  childrenAges: z.string().trim().max(200).optional().or(z.literal("")),
  experience: z.string().trim().max(2000).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

/**
 * Candidate pour devenir famille d'accueil chez un refuge.
 * Refusée si une candidature/active existe déjà pour ce couple.
 */
export async function applyAsFosterFamily(
  input: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await requireAuth();
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;
  if (!data.acceptsCats && !data.acceptsDogs) {
    return {
      success: false,
      error: "Sélectionnez au moins une espèce que vous pouvez accueillir.",
    };
  }

  const [existing] = await db
    .select({ id: fosterFamilies.id, status: fosterFamilies.status })
    .from(fosterFamilies)
    .where(
      and(
        eq(fosterFamilies.userId, session.user.id),
        eq(fosterFamilies.shelterId, data.shelterId),
        inArray(fosterFamilies.status, ["candidature", "active", "pause"])
      )
    )
    .limit(1);
  if (existing) {
    return {
      success: false,
      error:
        "Vous avez déjà une candidature ou un statut FA actif pour ce refuge.",
    };
  }

  const [created] = await db
    .insert(fosterFamilies)
    .values({
      userId: session.user.id,
      shelterId: data.shelterId,
      status: "candidature",
      acceptsCats: data.acceptsCats,
      acceptsDogs: data.acceptsDogs,
      maxCapacity: data.maxCapacity,
      hasGarden: data.hasGarden,
      hasOtherPets: data.hasOtherPets,
      otherPetsDescription: data.otherPetsDescription || null,
      hasChildren: data.hasChildren,
      childrenAges: data.childrenAges || null,
      experience: data.experience || null,
      motivation: data.motivation,
      address: data.address || null,
      phone: data.phone || null,
    })
    .returning({ id: fosterFamilies.id });

  if (!created) return { success: false, error: "Création impossible." };

  // Notif admins refuge (best-effort)
  try {
    const admins = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.role, "shelter_admin"),
          eq(users.shelterId, data.shelterId)
        )
      );
    for (const a of admins) {
      const tpl = fosterFamilyCandidatureEmailTemplate({
        adminName: a.name,
        candidateName: session.user.name,
      });
      void sendEmail({ to: a.email, ...tpl });
    }
  } catch (err) {
    console.error("foster candidature email failed", err);
  }

  revalidatePath("/shelter-familles-accueil");
  revalidatePath(`/familles-accueil/${data.shelterId}`);
  return { success: true, data: { id: created.id } };
}

const decisionSchema = z.object({
  id: z.string().uuid(),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function validateFosterFamily(
  input: unknown
): Promise<ActionResponse> {
  const session = await requireShelter();
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const [existing] = await db
    .select()
    .from(fosterFamilies)
    .where(eq(fosterFamilies.id, parsed.data.id))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Candidature introuvable." };
  }
  if (existing.status !== "candidature") {
    return { success: false, error: "Candidature déjà traitée." };
  }

  await db
    .update(fosterFamilies)
    .set({
      status: "active",
      validatedAt: new Date(),
      validatedByUserId: session.user.id,
      shelterNotes: parsed.data.note || existing.shelterNotes,
      updatedAt: new Date(),
    })
    .where(eq(fosterFamilies.id, parsed.data.id));

  await notifyCandidate(parsed.data.id, "validee", parsed.data.note || null);
  revalidatePath("/shelter-familles-accueil");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectFosterFamily(
  input: unknown
): Promise<ActionResponse> {
  const session = await requireShelter();
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const [existing] = await db
    .select()
    .from(fosterFamilies)
    .where(eq(fosterFamilies.id, parsed.data.id))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Candidature introuvable." };
  }
  if (existing.status !== "candidature") {
    return { success: false, error: "Candidature déjà traitée." };
  }

  await db
    .update(fosterFamilies)
    .set({
      status: "refusee",
      rejectedReason: parsed.data.note || null,
      validatedByUserId: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(fosterFamilies.id, parsed.data.id));

  await notifyCandidate(parsed.data.id, "refusee", parsed.data.note || null);
  revalidatePath("/shelter-familles-accueil");
  return { success: true };
}

export async function setFosterFamilyStatus(
  id: string,
  next: "active" | "pause" | "archive"
): Promise<ActionResponse> {
  const session = await requireShelter();
  const [existing] = await db
    .select({ shelterId: fosterFamilies.shelterId })
    .from(fosterFamilies)
    .where(eq(fosterFamilies.id, id))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "FA introuvable." };
  }
  await db
    .update(fosterFamilies)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(fosterFamilies.id, id));
  revalidatePath("/shelter-familles-accueil");
  return { success: true };
}

// ─── Placements ────────────────────────────────────────────────────────────

const placementSchema = z.object({
  petId: z.string().uuid(),
  fosterFamilyId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  expectedEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")
    .optional()
    .or(z.literal("")),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
  shelterNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createFosterPlacement(
  input: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await requireShelter();
  const parsed = placementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;

  // Vérifie ownership pet
  const [pet] = await db
    .select({ shelterId: pets.shelterId })
    .from(pets)
    .where(eq(pets.id, data.petId))
    .limit(1);
  if (!pet || pet.shelterId !== session.user.shelterId) {
    return { success: false, error: "Animal introuvable." };
  }

  // Vérifie FA appartient au refuge et est active
  const [fa] = await db
    .select({
      shelterId: fosterFamilies.shelterId,
      status: fosterFamilies.status,
    })
    .from(fosterFamilies)
    .where(eq(fosterFamilies.id, data.fosterFamilyId))
    .limit(1);
  if (!fa || fa.shelterId !== session.user.shelterId) {
    return { success: false, error: "FA introuvable." };
  }
  if (fa.status !== "active") {
    return {
      success: false,
      error: "Cette famille d'accueil n'est pas active.",
    };
  }

  // Refuse si le pet a déjà un placement actif
  const [conflict] = await db
    .select({ id: petFosterPlacements.id })
    .from(petFosterPlacements)
    .where(
      and(
        eq(petFosterPlacements.petId, data.petId),
        inArray(petFosterPlacements.status, ["planifie", "en_cours"])
      )
    )
    .limit(1);
  if (conflict) {
    return {
      success: false,
      error: "Cet animal a déjà un placement en cours ou planifié.",
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const status = data.startDate <= today ? "en_cours" : "planifie";

  const [created] = await db
    .insert(petFosterPlacements)
    .values({
      petId: data.petId,
      fosterFamilyId: data.fosterFamilyId,
      shelterId: session.user.shelterId,
      status,
      startDate: data.startDate,
      expectedEndDate: data.expectedEndDate || null,
      reason: data.reason || null,
      shelterNotes: data.shelterNotes || null,
      createdByUserId: session.user.id,
    })
    .returning({ id: petFosterPlacements.id });
  if (!created) return { success: false, error: "Création impossible." };

  revalidatePath("/shelter-familles-accueil");
  revalidatePath("/shelter");
  return { success: true, data: { id: created.id } };
}

const endPlacementSchema = z.object({
  id: z.string().uuid(),
  actualEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  fosterFeedback: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("")),
});

export async function endFosterPlacement(
  input: unknown
): Promise<ActionResponse> {
  const session = await requireShelter();
  const parsed = endPlacementSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const [existing] = await db
    .select()
    .from(petFosterPlacements)
    .where(eq(petFosterPlacements.id, parsed.data.id))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Placement introuvable." };
  }
  if (existing.status === "termine" || existing.status === "annule") {
    return { success: false, error: "Placement déjà clôturé." };
  }

  await db
    .update(petFosterPlacements)
    .set({
      status: "termine",
      actualEndDate: parsed.data.actualEndDate,
      fosterFeedback: parsed.data.fosterFeedback || null,
      updatedAt: new Date(),
    })
    .where(eq(petFosterPlacements.id, parsed.data.id));

  revalidatePath("/shelter-familles-accueil");
  return { success: true };
}

export async function cancelFosterPlacement(
  id: string
): Promise<ActionResponse> {
  const session = await requireShelter();
  const [existing] = await db
    .select({
      shelterId: petFosterPlacements.shelterId,
      status: petFosterPlacements.status,
    })
    .from(petFosterPlacements)
    .where(eq(petFosterPlacements.id, id))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Placement introuvable." };
  }
  if (existing.status !== "planifie") {
    return {
      success: false,
      error: "Seul un placement planifié peut être annulé.",
    };
  }
  await db
    .update(petFosterPlacements)
    .set({ status: "annule", updatedAt: new Date() })
    .where(eq(petFosterPlacements.id, id));
  revalidatePath("/shelter-familles-accueil");
  return { success: true };
}

// ─── Helpers internes ──────────────────────────────────────────────────────

async function notifyCandidate(
  fosterFamilyId: string,
  decision: "validee" | "refusee",
  note: string | null
) {
  try {
    const [row] = await db
      .select({
        userName: users.name,
        userEmail: users.email,
      })
      .from(fosterFamilies)
      .innerJoin(users, eq(users.id, fosterFamilies.userId))
      .where(eq(fosterFamilies.id, fosterFamilyId))
      .limit(1);
    if (!row) return;
    const tpl = fosterFamilyDecidedEmailTemplate({
      userName: row.userName,
      decision,
      note,
    });
    void sendEmail({ to: row.userEmail, ...tpl });
  } catch (err) {
    console.error("foster decision email failed", err);
  }
}
