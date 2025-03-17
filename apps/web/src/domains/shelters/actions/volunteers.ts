"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  shelterShifts,
  shelterShiftSignups,
  shelterVolunteers,
  users,
} from "@/server/db/schema";
import { requireAuth, requireShelter } from "@infra/auth/session";
import {
  sendEmail,
  volunteerCandidatureEmailTemplate,
  volunteerDecidedEmailTemplate,
} from "@infra/email";
import type { ActionResponse } from "@/types";

// ─── Candidatures bénévole ────────────────────────────────────────────────

const applySchema = z.object({
  shelterId: z.string().uuid(),
  motivation: z.string().trim().min(50, "Au moins 50 caractères").max(2000),
  skills: z.string().trim().max(2000).optional().or(z.literal("")),
  availability: z.string().trim().max(1000).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export async function applyAsVolunteer(
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

  const [existing] = await db
    .select({ id: shelterVolunteers.id })
    .from(shelterVolunteers)
    .where(
      and(
        eq(shelterVolunteers.userId, session.user.id),
        eq(shelterVolunteers.shelterId, data.shelterId),
        inArray(shelterVolunteers.status, ["candidature", "active", "pause"])
      )
    )
    .limit(1);
  if (existing) {
    return {
      success: false,
      error: "Vous êtes déjà inscrit ou en cours d'examen pour ce refuge.",
    };
  }

  const [created] = await db
    .insert(shelterVolunteers)
    .values({
      userId: session.user.id,
      shelterId: data.shelterId,
      status: "candidature",
      motivation: data.motivation,
      skills: data.skills || null,
      availability: data.availability || null,
      phone: data.phone || null,
    })
    .returning({ id: shelterVolunteers.id });
  if (!created) return { success: false, error: "Création impossible." };

  // Notif admins refuge
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
      const tpl = volunteerCandidatureEmailTemplate({
        adminName: a.name,
        candidateName: session.user.name,
      });
      void sendEmail({ to: a.email, ...tpl });
    }
  } catch (err) {
    console.error("volunteer candidature email failed", err);
  }

  revalidatePath("/shelter-planning");
  revalidatePath(`/devenir-benevole/${data.shelterId}`);
  return { success: true, data: { id: created.id } };
}

const decisionSchema = z.object({
  id: z.string().uuid(),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function validateVolunteer(
  input: unknown
): Promise<ActionResponse> {
  const session = await requireShelter();
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const [existing] = await db
    .select()
    .from(shelterVolunteers)
    .where(eq(shelterVolunteers.id, parsed.data.id))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Candidature introuvable." };
  }
  if (existing.status !== "candidature") {
    return { success: false, error: "Candidature déjà traitée." };
  }

  await db
    .update(shelterVolunteers)
    .set({
      status: "active",
      validatedAt: new Date(),
      validatedByUserId: session.user.id,
      shelterNotes: parsed.data.note || existing.shelterNotes,
      updatedAt: new Date(),
    })
    .where(eq(shelterVolunteers.id, parsed.data.id));

  await notifyVolunteer(parsed.data.id, "validee", parsed.data.note || null);
  revalidatePath("/shelter-planning");
  return { success: true };
}

export async function rejectVolunteer(
  input: unknown
): Promise<ActionResponse> {
  const session = await requireShelter();
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Données invalides." };

  const [existing] = await db
    .select()
    .from(shelterVolunteers)
    .where(eq(shelterVolunteers.id, parsed.data.id))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Candidature introuvable." };
  }
  if (existing.status !== "candidature") {
    return { success: false, error: "Candidature déjà traitée." };
  }

  await db
    .update(shelterVolunteers)
    .set({
      status: "refusee",
      rejectedReason: parsed.data.note || null,
      validatedByUserId: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(shelterVolunteers.id, parsed.data.id));

  await notifyVolunteer(parsed.data.id, "refusee", parsed.data.note || null);
  revalidatePath("/shelter-planning");
  return { success: true };
}

export async function setVolunteerStatus(
  id: string,
  next: "active" | "pause" | "archive"
): Promise<ActionResponse> {
  const session = await requireShelter();
  const [existing] = await db
    .select({ shelterId: shelterVolunteers.shelterId })
    .from(shelterVolunteers)
    .where(eq(shelterVolunteers.id, id))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Bénévole introuvable." };
  }
  await db
    .update(shelterVolunteers)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(shelterVolunteers.id, id));
  revalidatePath("/shelter-planning");
  return { success: true };
}

// ─── Créneaux (shifts) ────────────────────────────────────────────────────

const shiftSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3, "Titre trop court").max(255),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  startsAt: z.string().min(10, "Date début requise"),
  endsAt: z.string().min(10, "Date fin requise"),
  capacity: z.number().int().min(1).max(50).default(1),
});

export async function upsertShift(
  input: unknown
): Promise<ActionResponse<{ id: string }>> {
  const session = await requireShelter();
  const parsed = shiftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  const data = parsed.data;
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
    return { success: false, error: "Dates invalides." };
  }
  if (endsAt <= startsAt) {
    return {
      success: false,
      error: "La fin doit être postérieure au début.",
    };
  }

  if (data.id) {
    const [existing] = await db
      .select({ shelterId: shelterShifts.shelterId })
      .from(shelterShifts)
      .where(eq(shelterShifts.id, data.id))
      .limit(1);
    if (!existing || existing.shelterId !== session.user.shelterId) {
      return { success: false, error: "Créneau introuvable." };
    }
    await db
      .update(shelterShifts)
      .set({
        title: data.title,
        description: data.description || null,
        startsAt,
        endsAt,
        capacity: data.capacity,
        updatedAt: new Date(),
      })
      .where(eq(shelterShifts.id, data.id));
    revalidatePath("/shelter-planning");
    return { success: true, data: { id: data.id } };
  }

  const [created] = await db
    .insert(shelterShifts)
    .values({
      shelterId: session.user.shelterId,
      title: data.title,
      description: data.description || null,
      startsAt,
      endsAt,
      capacity: data.capacity,
      status: "ouvert",
      createdByUserId: session.user.id,
    })
    .returning({ id: shelterShifts.id });
  if (!created) return { success: false, error: "Création impossible." };

  revalidatePath("/shelter-planning");
  return { success: true, data: { id: created.id } };
}

export async function cancelShift(id: string): Promise<ActionResponse> {
  const session = await requireShelter();
  const [existing] = await db
    .select({ shelterId: shelterShifts.shelterId })
    .from(shelterShifts)
    .where(eq(shelterShifts.id, id))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Créneau introuvable." };
  }
  await db
    .update(shelterShifts)
    .set({ status: "annule", updatedAt: new Date() })
    .where(eq(shelterShifts.id, id));
  // Annule aussi les signups actifs
  await db
    .update(shelterShiftSignups)
    .set({ status: "annule", updatedAt: new Date() })
    .where(
      and(
        eq(shelterShiftSignups.shiftId, id),
        inArray(shelterShiftSignups.status, ["inscrit", "confirme"])
      )
    );
  revalidatePath("/shelter-planning");
  return { success: true };
}

export async function deleteShift(id: string): Promise<ActionResponse> {
  const session = await requireShelter();
  const [existing] = await db
    .select({ shelterId: shelterShifts.shelterId })
    .from(shelterShifts)
    .where(eq(shelterShifts.id, id))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Créneau introuvable." };
  }
  await db.delete(shelterShifts).where(eq(shelterShifts.id, id));
  revalidatePath("/shelter-planning");
  return { success: true };
}

// ─── Inscriptions ─────────────────────────────────────────────────────────

/** Le bénévole connecté s'inscrit à un créneau. */
export async function signUpToShift(
  shiftId: string
): Promise<ActionResponse<{ id: string }>> {
  const session = await requireAuth();

  const [shift] = await db
    .select()
    .from(shelterShifts)
    .where(eq(shelterShifts.id, shiftId))
    .limit(1);
  if (!shift) return { success: false, error: "Créneau introuvable." };
  if (shift.status !== "ouvert") {
    return { success: false, error: "Ce créneau n'est plus ouvert." };
  }
  if (shift.startsAt < new Date()) {
    return { success: false, error: "Ce créneau est déjà passé." };
  }

  const [volunteer] = await db
    .select({ id: shelterVolunteers.id, status: shelterVolunteers.status })
    .from(shelterVolunteers)
    .where(
      and(
        eq(shelterVolunteers.userId, session.user.id),
        eq(shelterVolunteers.shelterId, shift.shelterId)
      )
    )
    .limit(1);
  if (!volunteer || volunteer.status !== "active") {
    return {
      success: false,
      error:
        "Vous devez être bénévole actif validé par ce refuge pour vous inscrire.",
    };
  }

  // Capacité atteinte ?
  const [counts] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(shelterShiftSignups)
    .where(
      and(
        eq(shelterShiftSignups.shiftId, shiftId),
        inArray(shelterShiftSignups.status, ["inscrit", "confirme"])
      )
    );
  if ((counts?.n ?? 0) >= shift.capacity) {
    return { success: false, error: "Créneau complet." };
  }

  // Déjà inscrit ?
  const [dup] = await db
    .select({ id: shelterShiftSignups.id, status: shelterShiftSignups.status })
    .from(shelterShiftSignups)
    .where(
      and(
        eq(shelterShiftSignups.shiftId, shiftId),
        eq(shelterShiftSignups.volunteerId, volunteer.id)
      )
    )
    .limit(1);
  if (dup) {
    if (dup.status === "annule") {
      await db
        .update(shelterShiftSignups)
        .set({ status: "inscrit", updatedAt: new Date() })
        .where(eq(shelterShiftSignups.id, dup.id));
      revalidatePath("/mon-planning");
      revalidatePath("/shelter-planning");
      return { success: true, data: { id: dup.id } };
    }
    return { success: false, error: "Vous êtes déjà inscrit." };
  }

  const [created] = await db
    .insert(shelterShiftSignups)
    .values({
      shiftId,
      volunteerId: volunteer.id,
      shelterId: shift.shelterId,
      status: "inscrit",
    })
    .returning({ id: shelterShiftSignups.id });
  if (!created) return { success: false, error: "Création impossible." };

  // Marquer complet si plein
  if ((counts?.n ?? 0) + 1 >= shift.capacity) {
    await db
      .update(shelterShifts)
      .set({ status: "complet", updatedAt: new Date() })
      .where(eq(shelterShifts.id, shiftId));
  }

  revalidatePath("/mon-planning");
  revalidatePath("/shelter-planning");
  return { success: true, data: { id: created.id } };
}

/** Le bénévole connecté désinscrit son propre signup. */
export async function cancelMySignup(
  signupId: string
): Promise<ActionResponse> {
  const session = await requireAuth();

  const [row] = await db
    .select({
      signup: shelterShiftSignups,
      volunteer: shelterVolunteers,
      shift: shelterShifts,
    })
    .from(shelterShiftSignups)
    .innerJoin(
      shelterVolunteers,
      eq(shelterVolunteers.id, shelterShiftSignups.volunteerId)
    )
    .innerJoin(shelterShifts, eq(shelterShifts.id, shelterShiftSignups.shiftId))
    .where(eq(shelterShiftSignups.id, signupId))
    .limit(1);
  if (!row || row.volunteer.userId !== session.user.id) {
    return { success: false, error: "Inscription introuvable." };
  }
  if (!["inscrit", "confirme"].includes(row.signup.status)) {
    return { success: false, error: "Inscription déjà traitée." };
  }

  await db
    .update(shelterShiftSignups)
    .set({ status: "annule", updatedAt: new Date() })
    .where(eq(shelterShiftSignups.id, signupId));

  // Si le shift était complet, le ré-ouvre
  if (row.shift.status === "complet") {
    await db
      .update(shelterShifts)
      .set({ status: "ouvert", updatedAt: new Date() })
      .where(eq(shelterShifts.id, row.shift.id));
  }

  revalidatePath("/mon-planning");
  revalidatePath("/shelter-planning");
  return { success: true };
}

/** Le shelter_admin pointe l'arrivée d'un bénévole. */
export async function checkInSignup(
  signupId: string
): Promise<ActionResponse> {
  const session = await requireShelter();
  const [existing] = await db
    .select({
      shelterId: shelterShiftSignups.shelterId,
      checkInAt: shelterShiftSignups.checkInAt,
    })
    .from(shelterShiftSignups)
    .where(eq(shelterShiftSignups.id, signupId))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Inscription introuvable." };
  }
  if (existing.checkInAt) {
    return { success: false, error: "Arrivée déjà enregistrée." };
  }
  await db
    .update(shelterShiftSignups)
    .set({
      checkInAt: new Date(),
      status: "confirme",
      updatedAt: new Date(),
    })
    .where(eq(shelterShiftSignups.id, signupId));
  revalidatePath("/shelter-planning");
  return { success: true };
}

/** Le shelter_admin pointe le départ et clôture la prestation. */
export async function checkOutSignup(
  signupId: string
): Promise<ActionResponse> {
  const session = await requireShelter();
  const [existing] = await db
    .select()
    .from(shelterShiftSignups)
    .where(eq(shelterShiftSignups.id, signupId))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Inscription introuvable." };
  }
  if (!existing.checkInAt) {
    return { success: false, error: "Le check-in n'a pas été enregistré." };
  }
  if (existing.checkOutAt) {
    return { success: false, error: "Départ déjà enregistré." };
  }
  await db
    .update(shelterShiftSignups)
    .set({
      checkOutAt: new Date(),
      status: "termine",
      updatedAt: new Date(),
    })
    .where(eq(shelterShiftSignups.id, signupId));
  revalidatePath("/shelter-planning");
  return { success: true };
}

/** Le shelter_admin marque un bénévole absent. */
export async function markSignupAbsent(
  signupId: string
): Promise<ActionResponse> {
  const session = await requireShelter();
  const [existing] = await db
    .select({ shelterId: shelterShiftSignups.shelterId })
    .from(shelterShiftSignups)
    .where(eq(shelterShiftSignups.id, signupId))
    .limit(1);
  if (!existing || existing.shelterId !== session.user.shelterId) {
    return { success: false, error: "Inscription introuvable." };
  }
  await db
    .update(shelterShiftSignups)
    .set({ status: "absent", updatedAt: new Date() })
    .where(eq(shelterShiftSignups.id, signupId));
  revalidatePath("/shelter-planning");
  return { success: true };
}

// ─── Helper notif ──────────────────────────────────────────────────────────

async function notifyVolunteer(
  volunteerId: string,
  decision: "validee" | "refusee",
  note: string | null
) {
  try {
    const [row] = await db
      .select({
        userName: users.name,
        userEmail: users.email,
      })
      .from(shelterVolunteers)
      .innerJoin(users, eq(users.id, shelterVolunteers.userId))
      .where(eq(shelterVolunteers.id, volunteerId))
      .limit(1);
    if (!row) return;
    const tpl = volunteerDecidedEmailTemplate({
      userName: row.userName,
      decision,
      note,
    });
    void sendEmail({ to: row.userEmail, ...tpl });
  } catch (err) {
    console.error("volunteer decision email failed", err);
  }
}
