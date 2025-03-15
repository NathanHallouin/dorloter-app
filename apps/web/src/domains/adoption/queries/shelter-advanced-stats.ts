import { and, eq, sql } from "drizzle-orm";
import { db } from "@infra/db";
import { applications, pets } from "@/server/db/schema";

export interface HardToPlacePet {
  id: string;
  name: string;
  species: "chat" | "chien";
  breed: string | null;
  publishedAt: Date;
  daysAvailable: number;
  applicationsCount: number;
}

export interface ShelterAdvancedStats {
  // Durée moyenne entre publication et adoption (en jours).
  avgDaysToAdoption: {
    overall: number | null;
    cats: number | null;
    dogs: number | null;
  };

  // Conversion candidatures → adoptions.
  conversion: {
    applicationsTotal: number;
    applicationsAccepted: number;
    rate: number; // pourcentage 0-100
    avgApplicationsPerAdoption: number | null;
  };

  // Volume de candidatures sur 30 derniers jours.
  recent: {
    applicationsLast30d: number;
    adoptionsLast30d: number;
  };

  // Histogramme des adoptions 12 derniers mois.
  monthlyAdoptions: Array<{ monthKey: string; count: number }>;

  // Répartition par espèce (totaux).
  bySpecies: {
    chat: { total: number; available: number; adopted: number };
    chien: { total: number; available: number; adopted: number };
  };

  // Animaux à booster (disponibles depuis plus de 90 jours).
  hardToPlace: HardToPlacePet[];

  // Nombre de candidatures « bloquées » (envoyée) depuis > 7 jours.
  staleApplications: number;
}

/**
 * Statistiques avancées d'un refuge pour le dashboard `/shelter-stats`
 * (panel pro). Lit-only, six requêtes parallélisées en SQL natif pour
 * rester sous le statement_timeout Supabase.
 */
export async function getShelterAdvancedStats(
  shelterId: string
): Promise<ShelterAdvancedStats> {
  const [
    durationsRow,
    conversionRow,
    recentRow,
    monthlyRows,
    speciesRows,
    hardToPlaceRows,
    staleRow,
  ] = await Promise.all([
    // 1. Durée moyenne entre createdAt et updatedAt sur les pets adoptés.
    //    updatedAt fait office d'adoptedAt par convention (pas de colonne dédiée).
    db
      .select({
        species: pets.species,
        avgDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${pets.updatedAt} - ${pets.createdAt})) / 86400)`,
      })
      .from(pets)
      .where(and(eq(pets.shelterId, shelterId), eq(pets.status, "adopte")))
      .groupBy(pets.species),

    // 2. Conversion : nombre de candidatures totales + acceptées, et nombre
    //    moyen de candidatures par pet adopté.
    db
      .select({
        applicationsTotal: sql<number>`count(${applications.id})`,
        applicationsAccepted: sql<number>`count(*) FILTER (WHERE ${applications.status} = 'acceptee')`,
        adoptedPets: sql<number>`count(DISTINCT ${pets.id}) FILTER (WHERE ${pets.status} = 'adopte')`,
      })
      .from(applications)
      .innerJoin(pets, eq(pets.id, applications.petId))
      .where(eq(pets.shelterId, shelterId)),

    // 3. Activité 30 derniers jours.
    db
      .select({
        applicationsLast30d: sql<number>`count(${applications.id}) FILTER (WHERE ${applications.createdAt} >= now() - interval '30 days')`,
        adoptionsLast30d: sql<number>`count(DISTINCT ${pets.id}) FILTER (WHERE ${pets.status} = 'adopte' AND ${pets.updatedAt} >= now() - interval '30 days')`,
      })
      .from(pets)
      .leftJoin(applications, eq(applications.petId, pets.id))
      .where(eq(pets.shelterId, shelterId)),

    // 4. Histogramme mensuel des adoptions sur 12 mois.
    db
      .select({
        monthKey: sql<string>`to_char(date_trunc('month', ${pets.updatedAt}), 'YYYY-MM')`,
        count: sql<number>`count(*)`,
      })
      .from(pets)
      .where(
        and(
          eq(pets.shelterId, shelterId),
          eq(pets.status, "adopte"),
          sql`${pets.updatedAt} >= date_trunc('month', now() - interval '11 months')`
        )
      )
      .groupBy(sql`date_trunc('month', ${pets.updatedAt})`)
      .orderBy(sql`date_trunc('month', ${pets.updatedAt}) ASC`),

    // 5. Répartition par espèce.
    db
      .select({
        species: pets.species,
        total: sql<number>`count(*)`,
        available: sql<number>`count(*) FILTER (WHERE ${pets.status} = 'disponible')`,
        adopted: sql<number>`count(*) FILTER (WHERE ${pets.status} = 'adopte')`,
      })
      .from(pets)
      .where(eq(pets.shelterId, shelterId))
      .groupBy(pets.species),

    // 6. Animaux à booster : disponibles depuis > 90 jours, avec compteur
    //    de candidatures.
    db
      .select({
        id: pets.id,
        name: pets.name,
        species: pets.species,
        breed: pets.breed,
        publishedAt: pets.createdAt,
        applicationsCount: sql<number>`count(${applications.id})`,
      })
      .from(pets)
      .leftJoin(applications, eq(applications.petId, pets.id))
      .where(
        and(
          eq(pets.shelterId, shelterId),
          eq(pets.status, "disponible"),
          sql`${pets.createdAt} < now() - interval '90 days'`
        )
      )
      .groupBy(pets.id, pets.name, pets.species, pets.breed, pets.createdAt)
      .orderBy(pets.createdAt)
      .limit(10),

    // 7. Candidatures bloquées : envoyée depuis plus de 7 jours.
    db
      .select({
        count: sql<number>`count(${applications.id})`,
      })
      .from(applications)
      .innerJoin(pets, eq(pets.id, applications.petId))
      .where(
        and(
          eq(pets.shelterId, shelterId),
          eq(applications.status, "envoyee"),
          sql`${applications.createdAt} < now() - interval '7 days'`
        )
      ),
  ]);

  // ─── Durées ──────────────────────────────────────────────────────────────
  const durationsByspecies = new Map(
    durationsRow.map((r) => [r.species, Number(r.avgDays ?? 0)])
  );
  const cats = durationsByspecies.get("chat") ?? null;
  const dogs = durationsByspecies.get("chien") ?? null;
  const overallDurations = durationsRow.length
    ? Math.round(
        durationsRow.reduce((s, r) => s + Number(r.avgDays ?? 0), 0) /
          durationsRow.length
      )
    : null;

  // ─── Conversion ──────────────────────────────────────────────────────────
  const conv = conversionRow[0];
  const total = Number(conv?.applicationsTotal ?? 0);
  const accepted = Number(conv?.applicationsAccepted ?? 0);
  const adopted = Number(conv?.adoptedPets ?? 0);
  const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const avgPerAdoption =
    adopted > 0 ? Math.round((total / adopted) * 10) / 10 : null;

  // ─── Activité récente ────────────────────────────────────────────────────
  const recent = recentRow[0];

  // ─── Espèces ─────────────────────────────────────────────────────────────
  const speciesMap = new Map(
    speciesRows.map((r) => [
      r.species,
      {
        total: Number(r.total),
        available: Number(r.available),
        adopted: Number(r.adopted),
      },
    ])
  );

  return {
    avgDaysToAdoption: {
      overall: overallDurations,
      cats: cats !== null ? Math.round(cats) : null,
      dogs: dogs !== null ? Math.round(dogs) : null,
    },
    conversion: {
      applicationsTotal: total,
      applicationsAccepted: accepted,
      rate,
      avgApplicationsPerAdoption: avgPerAdoption,
    },
    recent: {
      applicationsLast30d: Number(recent?.applicationsLast30d ?? 0),
      adoptionsLast30d: Number(recent?.adoptionsLast30d ?? 0),
    },
    monthlyAdoptions: monthlyRows.map((r) => ({
      monthKey: r.monthKey,
      count: Number(r.count),
    })),
    bySpecies: {
      chat: speciesMap.get("chat") ?? { total: 0, available: 0, adopted: 0 },
      chien: speciesMap.get("chien") ?? { total: 0, available: 0, adopted: 0 },
    },
    hardToPlace: hardToPlaceRows.map((r) => {
      const days = Math.floor(
        (Date.now() - new Date(r.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: r.id,
        name: r.name,
        species: r.species,
        breed: r.breed,
        publishedAt: r.publishedAt,
        daysAvailable: days,
        applicationsCount: Number(r.applicationsCount ?? 0),
      };
    }),
    staleApplications: Number(staleRow[0]?.count ?? 0),
  };
}
