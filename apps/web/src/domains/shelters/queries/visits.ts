import { and, asc, between, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@infra/db";
import {
  shelterVisitBookings,
  shelterVisitSlots,
} from "@/server/db/schema";

export interface VisitSlot {
  id: string;
  shelterId: string;
  dayOfWeek: number;
  startMinutes: number;
  capacity: number;
  isActive: boolean;
}

export interface VisitBooking {
  id: string;
  shelterId: string;
  userId: string;
  petId: string | null;
  scheduledFor: Date;
  durationMinutes: number;
  status:
    | "en_attente"
    | "confirme"
    | "annule_par_refuge"
    | "annule_par_user"
    | "honore"
    | "no_show";
  userNotes: string | null;
  shelterNotes: string | null;
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getVisitSlotsForShelter(
  shelterId: string
): Promise<VisitSlot[]> {
  return db
    .select()
    .from(shelterVisitSlots)
    .where(eq(shelterVisitSlots.shelterId, shelterId))
    .orderBy(
      asc(shelterVisitSlots.dayOfWeek),
      asc(shelterVisitSlots.startMinutes)
    );
}

export async function getUpcomingBookingsForShelter(
  shelterId: string,
  from: Date = new Date()
): Promise<VisitBooking[]> {
  return db
    .select()
    .from(shelterVisitBookings)
    .where(
      and(
        eq(shelterVisitBookings.shelterId, shelterId),
        gte(shelterVisitBookings.scheduledFor, from)
      )
    )
    .orderBy(asc(shelterVisitBookings.scheduledFor));
}

/**
 * Bookings entre deux dates (utilisé pour calculer la disponibilité d'un
 * créneau au moment de la prise de RDV — 14 jours autour de maintenant).
 */
export async function getBookingsBetween(
  shelterId: string,
  from: Date,
  to: Date
): Promise<VisitBooking[]> {
  return db
    .select()
    .from(shelterVisitBookings)
    .where(
      and(
        eq(shelterVisitBookings.shelterId, shelterId),
        between(shelterVisitBookings.scheduledFor, from, to)
      )
    );
}

export async function getBookingById(
  id: string
): Promise<VisitBooking | null> {
  const [row] = await db
    .select()
    .from(shelterVisitBookings)
    .where(eq(shelterVisitBookings.id, id))
    .limit(1);
  return row ?? null;
}

export async function getBookingsForUser(
  userId: string
): Promise<VisitBooking[]> {
  return db
    .select()
    .from(shelterVisitBookings)
    .where(eq(shelterVisitBookings.userId, userId))
    .orderBy(desc(shelterVisitBookings.scheduledFor));
}

/**
 * Bookings dus à un rappel J-1 (cron) : confirmés, entre maintenant+18h
 * et maintenant+30h, et `reminder_sent_at` null. Cap à 200 par run.
 */
export async function getBookingsDueForReminder(
  windowStart: Date,
  windowEnd: Date
): Promise<VisitBooking[]> {
  return db
    .select()
    .from(shelterVisitBookings)
    .where(
      and(
        inArray(shelterVisitBookings.status, ["confirme", "en_attente"]),
        gte(shelterVisitBookings.scheduledFor, windowStart),
        lte(shelterVisitBookings.scheduledFor, windowEnd)
      )
    )
    .limit(200);
}
