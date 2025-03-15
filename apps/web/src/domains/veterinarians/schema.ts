import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { geometry } from "drizzle-orm/pg-core/columns/postgis_extension/geometry";

/**
 * Cabinets vétérinaires inscrits sur Dorloter.
 *
 * Professionnels uniquement : SIRET + numéro d'inscription à l'Ordre
 * National des Vétérinaires (ONV, format 5-6 chiffres). La vérification
 * est manuelle par un platform_admin via cross-check sur l'annuaire
 * officiel : https://annuaire-vet.ordre.veterinaire.fr
 *
 * Le rayon de recherche (`searchRadiusKm`) borne la zone géographique
 * dans laquelle le véto peut consulter les signalements perdus/trouvés
 * de la communauté Dorloter — limitation RGPD, on n'expose pas la base
 * entière à chaque cabinet.
 */
export const veterinarians = pgTable(
  "veterinarians",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).unique().notNull(),
    description: text(),
    // Identifiants pro obligatoires (vérifiés à la main par admin)
    siret: varchar({ length: 14 }).notNull(),
    orderNumber: varchar("order_number", { length: 50 }).notNull(),
    address: text(),
    location: geometry({ type: "point", srid: 4326, mode: "xy" }),
    phone: varchar({ length: 20 }),
    email: varchar({ length: 255 }),
    website: text(),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    // Espèces prises en charge
    acceptsCats: boolean("accepts_cats").default(true).notNull(),
    acceptsDogs: boolean("accepts_dogs").default(true).notNull(),
    acceptsNac: boolean("accepts_nac").default(false).notNull(),
    // Urgences 24/7
    emergencyAvailable: boolean("emergency_available").default(false).notNull(),
    // Services proposés : jsonb pour rester flexible. Clés attendues côté UI :
    // { xray, surgery, dental, hospitalization, behavior, homeopathy }.
    services: jsonb(),
    openingHours: text("opening_hours"),
    // Prix indicatif d'une consultation (information transparente pour
    // les adoptants et propriétaires).
    consultationPrice: decimal("consultation_price", {
      precision: 6,
      scale: 2,
    }),
    // Borne géographique pour la consultation des signalements (RGPD).
    // Modifiable par l'admin du cabinet, plafonné à 100 km côté validation.
    searchRadiusKm: integer("search_radius_km").default(30).notNull(),
    // Vérification manuelle par platform_admin (contrôle SIRET + ONV).
    isVerified: boolean("is_verified").default(false).notNull(),
    isDemo: boolean("is_demo").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("veterinarians_slug_idx").on(table.slug),
    index("veterinarians_location_idx").using("gist", table.location),
    index("veterinarians_verified_idx").on(table.isVerified),
  ]
);

export const vetPhotos = pgTable(
  "vet_photos",
  {
    id: uuid().primaryKey().defaultRandom(),
    vetId: uuid("vet_id")
      .notNull()
      .references(() => veterinarians.id, { onDelete: "cascade" }),
    url: text().notNull(),
    blurDataUrl: text("blur_data_url"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    order: integer().default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("vet_photos_vet_idx").on(table.vetId)]
);

/**
 * Audit log RGPD : trace toute consultation d'un signalement par un
 * compte vétérinaire. Permet de répondre à une demande d'accès d'un
 * particulier ("qui a vu mon annonce ?"), et de détecter un abus
 * (un véto qui consulterait massivement sans usage légitime).
 *
 * On stocke aussi `revealedContact` (true si le véto a appuyé sur
 * "afficher le contact") pour distinguer une simple consultation
 * de la lecture des données perso.
 */
export const vetReportAccessLog = pgTable(
  "vet_report_access_log",
  {
    id: uuid().primaryKey().defaultRandom(),
    vetId: uuid("vet_id")
      .notNull()
      .references(() => veterinarians.id, { onDelete: "cascade" }),
    // userId de l'admin véto qui a consulté (responsabilité individuelle).
    accessedByUserId: uuid("accessed_by_user_id"),
    reportId: uuid("report_id").notNull(),
    revealedContact: boolean("revealed_contact").default(false).notNull(),
    accessedAt: timestamp("accessed_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_report_access_log_vet_idx").on(table.vetId, table.accessedAt),
    index("vet_report_access_log_report_idx").on(
      table.reportId,
      table.accessedAt
    ),
  ]
);

/**
 * Trace des alertes envoyées à un cabinet véto suite à un signalement
 * perdu/trouvé dans son rayon. Permet :
 *   - idempotence (ne pas re-notifier le même véto pour le même signalement)
 *   - compteur « X vétos alertés » sur la fiche signalement
 *   - audit RGPD (qui a été prévenu, par quel canal)
 */
export const vetReportAlerts = pgTable(
  "vet_report_alerts",
  {
    id: uuid().primaryKey().defaultRandom(),
    vetId: uuid("vet_id")
      .notNull()
      .references(() => veterinarians.id, { onDelete: "cascade" }),
    reportId: uuid("report_id").notNull(),
    /** Distance véto ↔ signalement au moment de l'alerte (mètres). */
    distanceMeters: integer("distance_meters").notNull(),
    /** Canaux effectivement déclenchés (email, push, in-app). */
    emailSent: boolean("email_sent").default(false).notNull(),
    pushSent: boolean("push_sent").default(false).notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("vet_report_alerts_vet_report_unique").on(
      table.vetId,
      table.reportId
    ),
    index("vet_report_alerts_report_idx").on(table.reportId),
  ]
);

/**
 * Invitations à rejoindre l'équipe d'un cabinet (autres vétérinaires
 * salariés ou collaborateurs). Même pattern que `shelterInvitations`.
 */
export const vetInvitations = pgTable(
  "vet_invitations",
  {
    id: uuid().primaryKey().defaultRandom(),
    vetId: uuid("vet_id")
      .notNull()
      .references(() => veterinarians.id, { onDelete: "cascade" }),
    email: varchar({ length: 255 }).notNull(),
    invitedByUserId: uuid("invited_by_user_id").notNull(),
    token: varchar({ length: 64 }).notNull().unique(),
    status: varchar({ length: 20 }).default("en_attente").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_invitations_vet_idx").on(table.vetId, table.status),
    uniqueIndex("vet_invitations_token_idx").on(table.token),
  ]
);
