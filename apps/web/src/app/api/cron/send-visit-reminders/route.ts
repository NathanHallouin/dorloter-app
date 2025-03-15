import { NextResponse } from "next/server";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@infra/db";
import {
  pets,
  shelters,
  shelterVisitBookings,
  users,
} from "@/server/db/schema";
import { checkCronAuth } from "@infra/cron/auth";
import {
  sendEmail,
  visitBookingReminderEmailTemplate,
} from "@infra/email";

/**
 * Cron horaire : envoie un rappel pour chaque RDV `confirme` dont
 * `scheduled_for` tombe dans les 18 à 30 prochaines heures et qui n'a
 * pas encore reçu de rappel (`reminder_sent_at` null).
 *
 * Vercel Cron suggéré : `0 * * * *` (toutes les heures).
 */
export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  const now = new Date();
  const windowStart = new Date(now.getTime() + 18 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 30 * 60 * 60 * 1000);

  const rows = await db
    .select({
      bookingId: shelterVisitBookings.id,
      scheduledFor: shelterVisitBookings.scheduledFor,
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
        eq(shelterVisitBookings.status, "confirme"),
        gte(shelterVisitBookings.scheduledFor, windowStart),
        lte(shelterVisitBookings.scheduledFor, windowEnd),
        isNull(shelterVisitBookings.reminderSentAt)
      )
    )
    .limit(200);

  if (rows.length === 0) {
    return NextResponse.json({ sent: 0, at: now.toISOString() });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const tpl = visitBookingReminderEmailTemplate({
        userName: row.userName,
        petName: row.petName,
        shelterName: row.shelterName,
        shelterAddress: row.shelterAddress,
        scheduledFor: row.scheduledFor,
      });
      const result = await sendEmail({ to: row.userEmail, ...tpl });
      if (result.success) {
        await db
          .update(shelterVisitBookings)
          .set({ reminderSentAt: new Date(), updatedAt: new Date() })
          .where(eq(shelterVisitBookings.id, row.bookingId));
        sent += 1;
      } else {
        errors.push(`${row.userEmail}: ${result.error ?? "envoi échoué"}`);
      }
    } catch (err) {
      errors.push(
        `${row.userEmail}: ${err instanceof Error ? err.message : "erreur"}`
      );
    }
  }

  return NextResponse.json({
    candidates: rows.length,
    sent,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    at: now.toISOString(),
  });
}
