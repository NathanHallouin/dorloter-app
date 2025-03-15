"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@infra/db";
import {
  petTransfers,
  pets,
  shelters,
  users,
} from "@/server/db/schema";
import { requireShelter } from "@infra/auth/session";
import {
  sendEmail,
  petTransferRequestedEmailTemplate,
  petTransferDecidedEmailTemplate,
} from "@infra/email";
import type { ActionResponse } from "@/types";

const initiateSchema = z.object({
  petId: z.string().uuid(),
  toShelterId: z.string().uuid(),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

const decideSchema = z.object({
  transferId: z.string().uuid(),
  decisionNote: z.string().trim().max(2000).optional().or(z.literal("")),
});

/**
 * Initie un transfert depuis le refuge connecté vers un autre refuge.
 * - Vérifie ownership du pet (from = refuge connecté).
 * - Refuse si un transfert `en_attente` existe déjà pour ce pet.
 * - Crée la ligne, prévient les admins du refuge cible par email.
 */
export async function initiateTransfer(
  input: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await requireShelter();
  const parsed = initiateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;
  if (data.toShelterId === session.user.shelterId) {
    return {
      success: false,
      error: "Le refuge cible doit être différent du refuge d'origine.",
    };
  }

  const [pet] = await db
    .select({
      shelterId: pets.shelterId,
      name: pets.name,
      species: pets.species,
    })
    .from(pets)
    .where(eq(pets.id, data.petId))
    .limit(1);
  if (!pet) return { success: false, error: "Animal introuvable." };
  if (pet.shelterId !== session.user.shelterId) {
    return {
      success: false,
      error: "Vous ne pouvez transférer que les animaux de votre refuge.",
    };
  }

  const [existing] = await db
    .select({ id: petTransfers.id })
    .from(petTransfers)
    .where(
      and(
        eq(petTransfers.petId, data.petId),
        eq(petTransfers.status, "en_attente")
      )
    )
    .limit(1);
  if (existing) {
    return {
      success: false,
      error:
        "Un transfert est déjà en attente pour cet animal. Annulez-le ou attendez la décision.",
    };
  }

  const [toShelter] = await db
    .select({ name: shelters.name })
    .from(shelters)
    .where(eq(shelters.id, data.toShelterId))
    .limit(1);
  if (!toShelter) {
    return { success: false, error: "Refuge destinataire introuvable." };
  }

  const [fromShelter] = await db
    .select({ name: shelters.name })
    .from(shelters)
    .where(eq(shelters.id, session.user.shelterId))
    .limit(1);

  const [created] = await db
    .insert(petTransfers)
    .values({
      petId: data.petId,
      fromShelterId: session.user.shelterId,
      toShelterId: data.toShelterId,
      requestedByUserId: session.user.id,
      message: data.message || null,
      status: "en_attente",
    })
    .returning({ id: petTransfers.id });
  if (!created) {
    return { success: false, error: "Création impossible." };
  }

  // Email aux admins du refuge cible (best-effort).
  try {
    const toAdmins = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.role, "shelter_admin"),
          eq(users.shelterId, data.toShelterId)
        )
      );
    for (const a of toAdmins) {
      const tpl = petTransferRequestedEmailTemplate({
        userName: a.name,
        petName: pet.name,
        petSpecies: pet.species,
        fromShelterName: fromShelter?.name ?? "Un refuge partenaire",
        requestedByName: session.user.name,
        message: data.message || null,
        transferId: created.id,
      });
      void sendEmail({ to: a.email, ...tpl });
    }
  } catch (err) {
    console.error("transfer email failed", err);
  }

  revalidatePath("/shelter-transferts");
  revalidatePath(`/shelter-animaux/${data.petId}/edit`);
  return { success: true, data: { id: created.id } };
}

/**
 * Le refuge destinataire accepte le transfert. Met à jour atomiquement
 * `pets.shelter_id` + statut transfert.
 */
export async function acceptTransfer(
  input: unknown
): Promise<ActionResponse> {
  const session = await requireShelter();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Formulaire invalide." };
  }
  const { transferId, decisionNote } = parsed.data;

  const [transfer] = await db
    .select()
    .from(petTransfers)
    .where(eq(petTransfers.id, transferId))
    .limit(1);
  if (!transfer || transfer.toShelterId !== session.user.shelterId) {
    return { success: false, error: "Transfert introuvable." };
  }
  if (transfer.status !== "en_attente") {
    return { success: false, error: "Transfert déjà traité." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(pets)
      .set({
        shelterId: session.user.shelterId,
        updatedAt: new Date(),
      })
      .where(eq(pets.id, transfer.petId));
    await tx
      .update(petTransfers)
      .set({
        status: "accepte",
        decidedByUserId: session.user.id,
        decisionNote: decisionNote || null,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(petTransfers.id, transferId));
  });

  // Notif à l'initiateur (best-effort).
  try {
    const [pet] = await db
      .select({ name: pets.name })
      .from(pets)
      .where(eq(pets.id, transfer.petId))
      .limit(1);
    const [initiator] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, transfer.requestedByUserId))
      .limit(1);
    const [toShelter] = await db
      .select({ name: shelters.name })
      .from(shelters)
      .where(eq(shelters.id, session.user.shelterId))
      .limit(1);
    if (initiator && pet && toShelter) {
      const tpl = petTransferDecidedEmailTemplate({
        userName: initiator.name,
        petName: pet.name,
        toShelterName: toShelter.name,
        decided: "accepte",
        decisionNote: decisionNote || null,
      });
      void sendEmail({ to: initiator.email, ...tpl });
    }
  } catch (err) {
    console.error("transfer decided email failed", err);
  }

  revalidatePath("/shelter-transferts");
  revalidatePath("/shelter-animaux");
  return { success: true };
}

export async function declineTransfer(
  input: unknown
): Promise<ActionResponse> {
  const session = await requireShelter();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Formulaire invalide." };
  }
  const { transferId, decisionNote } = parsed.data;

  const [transfer] = await db
    .select()
    .from(petTransfers)
    .where(eq(petTransfers.id, transferId))
    .limit(1);
  if (!transfer || transfer.toShelterId !== session.user.shelterId) {
    return { success: false, error: "Transfert introuvable." };
  }
  if (transfer.status !== "en_attente") {
    return { success: false, error: "Transfert déjà traité." };
  }

  await db
    .update(petTransfers)
    .set({
      status: "refuse",
      decidedByUserId: session.user.id,
      decisionNote: decisionNote || null,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(petTransfers.id, transferId));

  // Notif à l'initiateur (best-effort)
  try {
    const [pet] = await db
      .select({ name: pets.name })
      .from(pets)
      .where(eq(pets.id, transfer.petId))
      .limit(1);
    const [initiator] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, transfer.requestedByUserId))
      .limit(1);
    const [toShelter] = await db
      .select({ name: shelters.name })
      .from(shelters)
      .where(eq(shelters.id, session.user.shelterId))
      .limit(1);
    if (initiator && pet && toShelter) {
      const tpl = petTransferDecidedEmailTemplate({
        userName: initiator.name,
        petName: pet.name,
        toShelterName: toShelter.name,
        decided: "refuse",
        decisionNote: decisionNote || null,
      });
      void sendEmail({ to: initiator.email, ...tpl });
    }
  } catch (err) {
    console.error("transfer decided email failed", err);
  }

  revalidatePath("/shelter-transferts");
  return { success: true };
}

/**
 * L'initiateur annule sa propre demande (tant qu'elle est en attente).
 */
export async function cancelTransfer(
  transferId: string
): Promise<ActionResponse> {
  const session = await requireShelter();
  const [transfer] = await db
    .select()
    .from(petTransfers)
    .where(eq(petTransfers.id, transferId))
    .limit(1);
  if (!transfer || transfer.fromShelterId !== session.user.shelterId) {
    return { success: false, error: "Transfert introuvable." };
  }
  if (transfer.status !== "en_attente") {
    return { success: false, error: "Transfert déjà traité." };
  }
  await db
    .update(petTransfers)
    .set({
      status: "annule",
      decidedByUserId: session.user.id,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(petTransfers.id, transferId));

  revalidatePath("/shelter-transferts");
  return { success: true };
}
