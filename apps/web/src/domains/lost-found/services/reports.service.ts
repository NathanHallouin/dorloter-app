/**
 * Service reports — logique métier des signalements perdu/trouvé.
 *
 * Voir docs/SERVICES-API.md pour la convention.
 *
 * Sécurité : on n'expose JAMAIS `contactPhone` / `contactEmail` en clair
 * dans une réponse publique. Les fiches retournées contiennent un flag
 * `hasContact` ; un endpoint dédié (avec rate-limit + log) sert à
 * révéler les coordonnées au cas par cas (cf. UX section 6.4).
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@infra/db";
import {
  conflict,
  gone,
  notFound,
  validationFailed,
} from "@infra/api/errors";
import { decodeCursor, encodeCursor } from "@infra/api/cursor";
import { logEvent } from "@infra/logger";
import { publish } from "@infra/event-bus";
import { reports, reportPhotos } from "@/server/db/schema";
import { refreshMatchesForReport } from "../queries/matching";
import type { ReportMatchesDiscoveredEvent } from "../events";
import type { ReportFormData } from "../validation";
import * as reportQueries from "../queries";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ReportType = "perdu" | "trouve";
export type ReportStatus = "actif" | "resolu" | "expire";
export type ReportSpecies = "chat" | "chien";
export type ReportSex = "male" | "femelle" | "inconnu";

export interface ReportSummary {
  id: string;
  type: ReportType;
  status: ReportStatus;
  species: ReportSpecies;
  petName: string | null;
  breed: string | null;
  color: string | null;
  sex: ReportSex;
  dateEvent: string; // ISO date YYYY-MM-DD
  address: string | null;
  location: { latitude: number; longitude: number };
  primaryPhoto: { url: string; blurDataUrl: string | null } | null;
  /**
   * Distance au point de référence en mètres, présente uniquement si la
   * requête a passé `lat`/`lng`/`radius`. Sinon null.
   */
  distanceMeters: number | null;
  createdAt: Date;
}

export interface ReportPhoto {
  id: string;
  url: string;
  blurDataUrl: string | null;
  isPrimary: boolean;
  order: number;
}

export interface ReportDetail extends Omit<ReportSummary, "primaryPhoto"> {
  description: string;
  isChipped: boolean;
  chipNumber: string | null;
  distinctiveSigns: string | null;
  notes: string | null;
  photos: ReportPhoto[];
  /**
   * Indique si le signalement a au moins une coordonnée de contact —
   * **les valeurs ne sont pas exposées**. La révélation passe par
   * l'endpoint dédié, rate-limité et loggué.
   */
  hasContact: boolean;
  resolvedAt: Date | null;
  updatedAt: Date;
}

export interface BoundingBox {
  /** Longitude min (Ouest). */
  west: number;
  /** Latitude min (Sud). */
  south: number;
  /** Longitude max (Est). */
  east: number;
  /** Latitude max (Nord). */
  north: number;
}

export interface ReportListFilters {
  type?: ReportType;
  status?: ReportStatus;
  species?: ReportSpecies;
  /** Bbox géographique : `[west, south, east, north]`. */
  bbox?: BoundingBox;
  /** Recherche par centre + rayon (km). Alternative à bbox. */
  near?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  /** Si défini, ne retourne que les signalements créés depuis N jours. */
  sinceDays?: number;
  /** Si défini, restreint aux signalements créés par cet utilisateur. */
  userId?: string;
}

export interface ReportListResult {
  reports: ReportSummary[];
  nextCursor: string | null;
}

interface CursorPayload {
  /** ISO date YYYY-MM-DD du dateEvent. */
  date: string;
  id: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Validations métier ────────────────────────────────────────────────────

function validateBbox(bbox: BoundingBox): void {
  if (
    bbox.west < -180 ||
    bbox.east > 180 ||
    bbox.south < -90 ||
    bbox.north > 90
  ) {
    throw validationFailed("Bbox hors des bornes géographiques.");
  }
  if (bbox.west >= bbox.east || bbox.south >= bbox.north) {
    throw validationFailed("Bbox dégénérée (limites inversées).");
  }
  // Un bbox > 5° lat/lng (~550 km) charge trop de markers — le client
  // doit zoomer ou paginer plus serré.
  if (bbox.north - bbox.south > 5 || bbox.east - bbox.west > 5) {
    throw validationFailed(
      "Bbox trop large · restreignez à moins de 5° de côté."
    );
  }
}

function validateNear(near: NonNullable<ReportListFilters["near"]>): void {
  if (
    near.latitude < -90 ||
    near.latitude > 90 ||
    near.longitude < -180 ||
    near.longitude > 180
  ) {
    throw validationFailed("Coordonnées hors des bornes géographiques.");
  }
  if (near.radiusKm <= 0 || near.radiusKm > 200) {
    throw validationFailed("Rayon invalide · entre 0.1 et 200 km.");
  }
}

// ─── listReports ───────────────────────────────────────────────────────────

/**
 * Liste paginée des signalements. Tri par `dateEvent DESC, id DESC`.
 *
 * Filtres :
 *   - `type` : perdu / trouve
 *   - `status` : actif (défaut) / resolu / expire
 *   - `species` : chat / chien
 *   - `bbox` (préféré pour les cartes) OU `near` (préféré pour la recherche
 *     utilisateur) — exclusifs entre eux, pas les deux à la fois
 *   - `sinceDays` : 1 / 7 / 30 (créés depuis N jours)
 *
 * Sortie : `ReportSummary[]` avec photo principale et localisation. Pas
 * de description longue, pas de notes — récupérés via `getReportWithDetails`.
 *
 * Si `near` est passé, chaque résultat a `distanceMeters` rempli et la
 * liste est triée par distance ASC (au lieu de date DESC).
 */
export async function listReports(input: {
  filters?: ReportListFilters;
  cursor?: string | null;
  limit?: number;
}): Promise<ReportListResult> {
  const filters = input.filters ?? {};
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100);

  if (filters.bbox && filters.near) {
    throw validationFailed(
      "`bbox` et `near` sont exclusifs · utilisez l'un ou l'autre."
    );
  }
  if (filters.bbox) validateBbox(filters.bbox);
  if (filters.near) validateNear(filters.near);

  const conditions = [];
  // Default à "actif" sauf si on filtre par utilisateur (mes signalements
  // doit montrer toutes les statuts par défaut — actif, résolu, expiré).
  const defaultStatus = filters.userId ? undefined : "actif";
  const effectiveStatus = filters.status ?? defaultStatus;
  if (effectiveStatus) {
    conditions.push(eq(reports.status, effectiveStatus));
  }
  if (filters.type) conditions.push(eq(reports.type, filters.type));
  if (filters.species) conditions.push(eq(reports.species, filters.species));

  if (filters.bbox) {
    const { west, south, east, north } = filters.bbox;
    conditions.push(
      sql`ST_Intersects(
        ${reports.location},
        ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)
      )`
    );
  }
  if (filters.near) {
    const meters = filters.near.radiusKm * 1000;
    const { latitude, longitude } = filters.near;
    conditions.push(
      sql`ST_DWithin(
        ${reports.location}::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${meters}
      )`
    );
  }
  if (filters.sinceDays && filters.sinceDays > 0) {
    conditions.push(
      sql`${reports.createdAt} > now() - (${filters.sinceDays}::int * interval '1 day')`
    );
  }
  if (filters.userId) {
    conditions.push(eq(reports.userId, filters.userId));
  }

  // Cursor (uniquement en mode tri par date — `near` trie par distance et
  // n'utilise pas de cursor pour la première itération)
  if (input.cursor && !filters.near) {
    const c = decodeCursor<CursorPayload>(input.cursor);
    conditions.push(
      sql`(${reports.dateEvent}, ${reports.id}) < (${c.date}::date, ${c.id}::uuid)`
    );
  }

  // Distance comme colonne calculée si near est passé
  const distanceCol = filters.near
    ? sql<number>`ST_Distance(
        ${reports.location}::geography,
        ST_SetSRID(ST_MakePoint(${filters.near.longitude}, ${filters.near.latitude}), 4326)::geography
      )`.as("distance_meters")
    : sql<number | null>`null`.as("distance_meters");

  const orderBy = filters.near
    ? sql`distance_meters ASC`
    : sql`${reports.dateEvent} DESC, ${reports.id} DESC`;

  const rows = await db
    .select({
      id: reports.id,
      type: reports.type,
      status: reports.status,
      species: reports.species,
      petName: reports.petName,
      breed: reports.breed,
      color: reports.color,
      sex: reports.sex,
      dateEvent: reports.dateEvent,
      address: reports.address,
      location: reports.location,
      createdAt: reports.createdAt,
      photoUrl: sql<string | null>`(
        SELECT url FROM ${reportPhotos}
        WHERE ${reportPhotos.reportId} = ${reports.id}
          AND ${reportPhotos.isPrimary} = true
        LIMIT 1
      )`,
      photoBlur: sql<string | null>`(
        SELECT blur_data_url FROM ${reportPhotos}
        WHERE ${reportPhotos.reportId} = ${reports.id}
          AND ${reportPhotos.isPrimary} = true
        LIMIT 1
      )`,
      distanceMeters: distanceCol,
    })
    .from(reports)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  // Pas de cursor en mode `near` (tri par distance, pas adapté au cursor
  // simple — on attend un client qui demande plus de rayon)
  const nextCursor =
    hasMore && !filters.near
      ? (() => {
          const last = page[page.length - 1]!;
          return encodeCursor<CursorPayload>({
            date: last.dateEvent,
            id: last.id,
          });
        })()
      : null;

  return {
    reports: page.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      species: r.species,
      petName: r.petName,
      breed: r.breed,
      color: r.color,
      sex: r.sex,
      dateEvent: r.dateEvent,
      address: r.address,
      // location PostGIS mode "xy" → { x: lng, y: lat }
      location: r.location
        ? { latitude: r.location.y, longitude: r.location.x }
        : { latitude: 0, longitude: 0 },
      primaryPhoto: r.photoUrl
        ? { url: r.photoUrl, blurDataUrl: r.photoBlur }
        : null,
      distanceMeters:
        r.distanceMeters !== null ? Number(r.distanceMeters) : null,
      createdAt: r.createdAt,
    })),
    nextCursor,
  };
}

// ─── getReportWithDetails ──────────────────────────────────────────────────

/**
 * Fiche détaillée d'un signalement. Inclut toutes les photos et la
 * description longue. Pas de matches (endpoint séparé, auth-requis pour
 * les propriétaires uniquement).
 *
 * **Sécurité contact** : on retourne `hasContact: boolean` mais jamais
 * les valeurs `contactPhone` / `contactEmail` en clair. Voir
 * `revealReportContact` pour la révélation rate-limitée.
 *
 * Throw `NOT_FOUND` si l'id n'est pas un UUID, n'existe pas, ou que le
 * signalement est `expire` (= masqué publiquement).
 */
export async function getReportWithDetails(id: string): Promise<ReportDetail> {
  if (!UUID_RE.test(id)) {
    throw notFound("Signalement", id);
  }

  const report = await reportQueries.getReportWithPhotos(id);
  if (!report) {
    throw notFound("Signalement", id);
  }

  // Statut "expire" = caché côté public (durée de vie écoulée + pas de
  // résolution confirmée). On masque comme un 404 — l'auteur peut toujours
  // y accéder via /mes-signalements.
  if (report.status === "expire") {
    throw notFound("Signalement", id);
  }

  const photos: ReportPhoto[] = (report.photos ?? []).map((p) => ({
    id: p.id,
    url: p.url,
    blurDataUrl: p.blurDataUrl,
    isPrimary: p.isPrimary,
    order: p.order,
  }));

  return {
    id: report.id,
    type: report.type,
    status: report.status,
    species: report.species,
    petName: report.petName,
    breed: report.breed,
    color: report.color,
    sex: report.sex,
    dateEvent: report.dateEvent,
    address: report.address,
    location: report.location
      ? { latitude: report.location.y, longitude: report.location.x }
      : { latitude: 0, longitude: 0 },
    description: report.description,
    isChipped: report.isChipped,
    chipNumber: report.chipNumber,
    distinctiveSigns: report.distinctiveSigns,
    notes: report.notes,
    photos,
    hasContact: !!(report.contactPhone || report.contactEmail),
    distanceMeters: null,
    resolvedAt: report.resolvedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

// ─── Révélation contact ────────────────────────────────────────────────────

export interface RevealedContact {
  phone: string | null;
  email: string | null;
}

/**
 * Révèle les coordonnées de contact d'un signalement actif.
 *
 * Le rate-limit n'est PAS appliqué ici — il est géré par la couche
 * appelante (Server Action ou route API via `withApi`). Le service se
 * concentre sur la logique : valider l'ID, vérifier l'état, logger.
 *
 * Throws :
 *   - `validationFailed` si l'ID n'est pas un UUID
 *   - `notFound` si le signalement n'existe pas
 *   - `gone` (410) si le signalement est résolu ou expiré
 */
export async function revealReportContact(
  reportId: string,
  context: { userId: string | null }
): Promise<RevealedContact> {
  if (!UUID_RE.test(reportId)) {
    throw validationFailed("ID de signalement invalide.");
  }

  const [row] = await db
    .select({
      contactPhone: reports.contactPhone,
      contactEmail: reports.contactEmail,
      status: reports.status,
    })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  if (!row) {
    throw notFound("Signalement", reportId);
  }
  if (row.status !== "actif") {
    throw gone("Ce signalement n'est plus actif.");
  }

  logEvent(
    "report.contact_revealed",
    { reportId },
    { userId: context.userId ?? undefined }
  );

  return { phone: row.contactPhone, email: row.contactEmail };
}

// ─── Création de signalement ───────────────────────────────────────────────

export interface CreateReportPhotoInput {
  url: string;
  blurDataUrl?: string | null;
}

export interface CreateReportInput extends ReportFormData {
  photos?: CreateReportPhotoInput[];
}

export interface CreateReportResult {
  id: string;
  /** Nombre de matches détectés à la création. */
  matchCount: number;
}

/**
 * Crée un signalement perdu/trouvé. Le rate-limit + la session sont
 * gérés par le caller (Server Action ou route API).
 *
 * Effets de bord :
 *   - INSERT reports + report_photos (transaction implicite)
 *   - Recompute matching et stockage dans report_matches
 *   - Publish `lost-found.matches_discovered` si candidats trouvés
 *   - Log `report.created`
 *
 * Anti-duplicat : si l'user a déjà un signalement actif similaire
 * (même type, similarité description > 0.6, < 30 jours), throw `conflict`
 * pour guider vers l'édition au lieu de la création.
 */
export async function createReport(
  userId: string,
  input: CreateReportInput
): Promise<CreateReportResult> {
  // Anti-duplicat (cf. action createReport historique)
  const [duplicate] = await db
    .select({ id: reports.id, createdAt: reports.createdAt })
    .from(reports)
    .where(
      sql`${reports.userId} = ${userId}
        AND ${reports.status} = 'actif'
        AND ${reports.type} = ${input.type}
        AND ${reports.createdAt} > now() - interval '30 days'
        AND similarity(${reports.description}, ${input.description}) > 0.6`
    )
    .orderBy(sql`similarity(${reports.description}, ${input.description}) DESC`)
    .limit(1);

  if (duplicate) {
    throw conflict(
      "Vous avez déjà un signalement actif très similaire · éditez l'existant plutôt que d'en créer un nouveau.",
      { existingReportId: duplicate.id }
    );
  }

  const [inserted] = await db
    .insert(reports)
    .values({
      userId,
      type: input.type,
      species: input.species,
      petName: input.petName,
      description: input.description,
      breed: input.breed,
      color: input.color,
      sex: input.sex,
      isChipped: input.isChipped,
      chipNumber: input.chipNumber,
      distinctiveSigns: input.distinctiveSigns,
      location:
        sql`ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)` as never,
      address: input.address,
      dateEvent: input.dateEvent,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      notes: input.notes,
    })
    .returning();

  const report = inserted!;

  if (input.photos && input.photos.length > 0) {
    await db.insert(reportPhotos).values(
      input.photos.map((p, i) => ({
        reportId: report.id,
        url: p.url,
        blurDataUrl: p.blurDataUrl ?? null,
        isPrimary: i === 0,
        order: i,
      }))
    );
  }

  logEvent(
    "report.created",
    {
      reportId: report.id,
      type: report.type,
      hasPhotos: !!input.photos && input.photos.length > 0,
    },
    { userId }
  );

  const candidates = await refreshMatchesForReport(report);

  if (candidates.length > 0) {
    publish<ReportMatchesDiscoveredEvent>({
      type: "lost-found.matches_discovered",
      reportId: report.id,
      reportOwnerUserId: report.userId,
      reportType: report.type,
      matches: candidates.map((c) => ({
        reportId: c.report.id,
        reportOwnerUserId: c.report.userId,
        score: c.score,
        distanceMeters: c.distanceMeters,
      })),
    });
  }

  return { id: report.id, matchCount: candidates.length };
}
