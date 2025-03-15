import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { shelterEvents, shelters } from "@/server/db/schema";
import type {
  ShelterEvent,
  PublicEvent,
  ShelterEventType,
} from "../lib/event-types";

function castRow(row: typeof shelterEvents.$inferSelect): ShelterEvent {
  return {
    id: row.id,
    shelterId: row.shelterId,
    type: row.type as ShelterEventType,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    venueAddress: row.venueAddress,
    location: row.location,
    externalUrl: row.externalUrl,
    isPublished: row.isPublished,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Événements (publiés ou non) d'un refuge, triés par date de début
 * (futurs d'abord). Utilisé sur `/shelter-evenements`.
 */
export async function getEventsForShelter(
  shelterId: string
): Promise<ShelterEvent[]> {
  const rows = await db
    .select()
    .from(shelterEvents)
    .where(eq(shelterEvents.shelterId, shelterId))
    .orderBy(asc(shelterEvents.startsAt));
  return rows.map(castRow);
}

export async function getEventById(id: string): Promise<ShelterEvent | null> {
  const [row] = await db
    .select()
    .from(shelterEvents)
    .where(eq(shelterEvents.id, id))
    .limit(1);
  return row ? castRow(row) : null;
}

export interface PublicEventsFilters {
  type?: ShelterEventType;
  shelterId?: string;
  /** Bornes temporelles (par défaut : aujourd'hui → +180 jours). */
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Liste publique des événements à venir, avec adresse/location effectives
 * (venue custom ou fallback refuge). Triés par date croissante.
 */
export async function listPublicEvents(
  filters: PublicEventsFilters = {},
  limit = 50
): Promise<PublicEvent[]> {
  const from = filters.fromDate ?? new Date();
  const to =
    filters.toDate ??
    new Date(from.getTime() + 180 * 24 * 60 * 60 * 1000);

  const conditions = [
    eq(shelterEvents.isPublished, true),
    gte(shelterEvents.startsAt, from),
    lte(shelterEvents.startsAt, to),
  ];
  if (filters.type) conditions.push(eq(shelterEvents.type, filters.type));
  if (filters.shelterId)
    conditions.push(eq(shelterEvents.shelterId, filters.shelterId));

  const rows = await db
    .select({
      event: shelterEvents,
      shelterName: shelters.name,
      shelterSlug: shelters.slug,
      shelterAddress: shelters.address,
      shelterLocation: shelters.location,
    })
    .from(shelterEvents)
    .innerJoin(shelters, eq(shelters.id, shelterEvents.shelterId))
    .where(and(...conditions))
    .orderBy(asc(shelterEvents.startsAt))
    .limit(limit);

  return rows.map((r) => ({
    ...castRow(r.event),
    shelterName: r.shelterName,
    shelterSlug: r.shelterSlug,
    effectiveAddress: r.event.venueAddress ?? r.shelterAddress,
    effectiveLocation: r.event.location ?? r.shelterLocation,
  }));
}

/**
 * Liste des refuges qui ont au moins un événement publié à venir — pour
 * filtre côté page publique.
 */
export async function getSheltersWithUpcomingEvents(): Promise<
  Array<{ id: string; name: string; slug: string; count: number }>
> {
  const rows = await db
    .select({
      id: shelters.id,
      name: shelters.name,
      slug: shelters.slug,
      count: sql<number>`count(${shelterEvents.id})::int`,
    })
    .from(shelters)
    .innerJoin(shelterEvents, eq(shelterEvents.shelterId, shelters.id))
    .where(
      and(
        eq(shelterEvents.isPublished, true),
        gte(shelterEvents.startsAt, new Date())
      )
    )
    .groupBy(shelters.id, shelters.name, shelters.slug)
    .orderBy(desc(sql`count(${shelterEvents.id})`));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    count: Number(r.count),
  }));
}
