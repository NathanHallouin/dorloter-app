"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@infra/db";
import {
  pets,
  shelterVisitBookings,
  shelterVisitSlots,
  shelters,
  users,
} from "@/server/db/schema";
import { requireAuth, requireShelter } from "@infra/auth/session";
import {
  sendEmail,
  visitBookingConfirmedEmailTemplate,
  visitBookingRefusedEmailTemplate,
} from "@infra/email";
import type { ActionResponse } from "@/types";

// ─── Slots config (refuge) ─────────────────────────────────────────────────

const slotInputSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  startMinutes: z.number().int().min(0).max(1410),
  capacity: z.number().int().min(1).max(20).default(1),
});

/**
 * Remplace TOUS les créneaux du refuge par la liste fournie (idempotent,
 * simplifie la grille de config côté UI). Bookings existants conservés.
 */
export async function replaceShelterVisitSlots(
  inputs: Array<{
    dayOfWeek: number;
    startMinutes: number;
    capacity: number;
  }>
): Promise<ActionResponse<{ count: number }>> {
  const session = await requireShelter();

  const parsed = z.array(slotInputSchema).max(7 * 22).safeParse(inputs);
  if (!parsed.success) {
    return {
      success: false,
      error: "Créneaux invalides.",
    };
  }

  // Déduplique strictement par (day, startMinutes)
  const seen = new Set<string>();
  const cleaned = parsed.data.filter((s) => {
    const key = `${s.dayOfWeek}_${s.startMinutes}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await db.transaction(async (tx) => {
    await tx
      .delete(shelterVisitSlots)
      .where(eq(shelterVisitSlots.shelterId, session.user.shelterId));
    if (cleaned.length > 0) {
      await tx.insert(shelterVisitSlots).values(
        cleaned.map((s) => ({
          shelterId: session.user.shelterId,
          dayOfWeek: s.dayOfWeek,
          startMinutes: s.startMinutes,
          capacity: s.capacity,
          isActive: true,
        }))
      );
    }
  });

  revalidatePath("/shelter-parametres-creneaux");
  return { success: true, data: { count: cleaned.length } };
}

// ─── Bookings (adoptant + refuge) ──────────────────────────────────────────

const createBookingSchema = z.object({
  shelterId: z.string().uuid(),
  petId: z.string().uuid().nullable().optional(),
  scheduledFor: z.string().datetime(),
  userNotes: z.string().max(1000).optional(),
});

export async function createVisitBooking(input: {
  shelterId: string;
  petId?: string | null;
  scheduledFor: string;
  userNotes?: string;
}): Promise<ActionResponse<{ id: string }>> {
  const session = await requireAuth();
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Formulaire invalide.",
    };
  }

  const scheduled = new Date(parsed.data.scheduledFor);
  if (Number.isNaN(scheduled.getTime())) {
    return { success: false, error: "Date invalide." };
  }
  if (scheduled.getTime() < Date.now() + 60 * 60 * 1000) {
    return {
      success: false,
      error: "Choisissez un créneau au moins 1 heure dans le futur.",
    };
  }

  try {
    const [created] = await db
      .insert(shelterVisitBookings)
      .values({
        shelterId: parsed.data.shelterId,
        userId: session.user.id,
        petId: parsed.data.petId ?? null,
        scheduledFor: scheduled,
        userNotes: parsed.data.userNotes ?? null,
        status: "en_attente",
      })
      .returning({ id: shelterVisitBookings.id });
    if (!created) {
      return { success: false, error: "Création impossible." };
    }
    revalidatePath("/dashboard");
    revalidatePath("/shelter-rdv");
    return { success: true, data: { id: created.id } };
  } catch (err) {
    // Conflit unique : même user a déjà ce créneau
    if (err instanceof Error && /unique/i.test(err.message)) {
      return {
        success: false,
        error: "Vous avez déjà un RDV à ce créneau.",
      };
    }
    throw err;
  }
}

const statusUpdateSchema = z.enum([
  "confirme",
  "annule_par_refuge",
  "honore",
  "no_show",
]);

export async function updateBookingStatusAsShelter(
  bookingId: string,
  status: z.infer<typeof statusUpdateSchema>,
  shelterNotes?: string
): Promise<ActionResponse> {
  const session = await requireShelter();
  const parsed = statusUpdateSchema.safeParse(status);
  if (!parsed.success) return { success: false, error: "Statut invalide." };

  // On lit le booking + le user/pet/shelter pour pouvoir notifier par
  // email dans la foulée (confirmation ou refus).
  const [row] = await db
    .select({
      bookingId: shelterVisitBookings.id,
      scheduledFor: shelterVisitBookings.scheduledFor,
      petId: shelterVisitBookings.petId,
      petName: pets.name,
      userEmail: users.email,
      userName: users.name,
      shelterName: shelters.name,
      shelterAddress: shelters.address,
    })
    .from(shelterVisitBookings)
    .innerJoin(users, eq(users.id, shelterVisitBookings.userId))
    .innerJoin(shelters, eq(shelters.id, shelterVisitBookings.shelterId))
    .leftJoin(pets, eq(pets.id, shelterVisitBookings.petId))
    .where(
      and(
        eq(shelterVisitBookings.id, bookingId),
        eq(shelterVisitBookings.shelterId, session.user.shelterId)
      )
    )
    .limit(1);

  if (!row) {
    return { success: false, error: "Rendez-vous introuvable." };
  }

  await db
    .update(shelterVisitBookings)
    .set({
      status: parsed.data,
      shelterNotes: shelterNotes ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(shelterVisitBookings.id, bookingId));

  // Notifications email (best-effort, on n'échoue pas l'action si l'email
  // ne part pas).
  if (parsed.data === "confirme") {
    void sendEmail({
      to: row.userEmail,
      ...visitBookingConfirmedEmailTemplate({
        userName: row.userName,
        petName: row.petName,
        shelterName: row.shelterName,
        shelterAddress: row.shelterAddress,
        scheduledFor: row.scheduledFor,
      }),
    });
  } else if (parsed.data === "annule_par_refuge") {
    void sendEmail({
      to: row.userEmail,
      ...visitBookingRefusedEmailTemplate({
        userName: row.userName,
        petName: row.petName,
        shelterName: row.shelterName,
        scheduledFor: row.scheduledFor,
      }),
    });
  }

  revalidatePath("/shelter-rdv");
  return { success: true };
}

export async function cancelBookingAsUser(
  bookingId: string
): Promise<ActionResponse> {
  const session = await requireAuth();
  await db
    .update(shelterVisitBookings)
    .set({ status: "annule_par_user", updatedAt: new Date() })
    .where(
      and(
        eq(shelterVisitBookings.id, bookingId),
        eq(shelterVisitBookings.userId, session.user.id)
      )
    );
  revalidatePath("/dashboard");
  return { success: true };
}
