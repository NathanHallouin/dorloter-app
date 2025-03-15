import { asc, desc, eq, gte, isNotNull, lte, and, inArray } from "drizzle-orm";
import { db } from "@infra/db";
import { petMedicalEvents } from "@/server/db/schema";
import type { MedicalEvent } from "../lib/medical-event-types";

function castRow(
  row: typeof petMedicalEvents.$inferSelect
): MedicalEvent {
  return {
    id: row.id,
    petId: row.petId,
    type: row.type as MedicalEvent["type"],
    title: row.title,
    notes: row.notes,
    eventDate: row.eventDate,
    nextReminderAt: row.nextReminderAt,
    vetNameFreeform: row.vetNameFreeform,
    attachmentUrl: row.attachmentUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Timeline complète des évènements médicaux d'un animal, triée du plus
 * récent au plus ancien.
 */
export async function getMedicalEventsForPet(
  petId: string
): Promise<MedicalEvent[]> {
  const rows = await db
    .select()
    .from(petMedicalEvents)
    .where(eq(petMedicalEvents.petId, petId))
    .orderBy(desc(petMedicalEvents.eventDate), desc(petMedicalEvents.createdAt));
  return rows.map(castRow);
}

export async function getMedicalEventById(
  id: string
): Promise<MedicalEvent | null> {
  const [row] = await db
    .select()
    .from(petMedicalEvents)
    .where(eq(petMedicalEvents.id, id))
    .limit(1);
  return row ? castRow(row) : null;
}

/**
 * Rappels à venir entre deux dates (utilisé pour la sidebar refuge et
 * éventuels emails de rappel).
 */
export async function getUpcomingRemindersForShelter(
  petIds: string[],
  fromISODate: string,
  toISODate: string
): Promise<MedicalEvent[]> {
  if (petIds.length === 0) return [];
  const rows = await db
    .select()
    .from(petMedicalEvents)
    .where(
      and(
        inArray(petMedicalEvents.petId, petIds),
        isNotNull(petMedicalEvents.nextReminderAt),
        gte(petMedicalEvents.nextReminderAt, fromISODate),
        lte(petMedicalEvents.nextReminderAt, toISODate)
      )
    )
    .orderBy(asc(petMedicalEvents.nextReminderAt));
  return rows.map(castRow);
}
