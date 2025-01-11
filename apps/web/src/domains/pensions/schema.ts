import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { geometry } from "drizzle-orm/pg-core/columns/postgis_extension/geometry";
import { users } from "@/server/db/schema";

export const pensions = pgTable(
  "pensions",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).unique().notNull(),
    description: text(),
    // Professionnel uniquement : SIRET + numéro d'agrément préfecture (certificat
    // de capacité ou déclaration ICPE selon l'effectif). Les particuliers et
    // promeneurs ne sont pas acceptés sur Dorloter — focus pros agréés.
    siret: varchar({ length: 14 }).notNull(),
    agrementNumber: varchar("agrement_number", { length: 100 }),
    address: text(),
    location: geometry({ type: "point", srid: 4326, mode: "xy" }),
    phone: varchar({ length: 20 }),
    email: varchar({ length: 255 }),
    website: text(),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    // Espèces acceptées — deux booléens plutôt qu'un enum, pour que
    // l'annuaire puisse filtrer "accepte chats ET chiens" simplement.
    acceptsCats: boolean("accepts_cats").default(false).notNull(),
    acceptsDogs: boolean("accepts_dogs").default(false).notNull(),
    capacityCats: integer("capacity_cats"),
    capacityDogs: integer("capacity_dogs"),
    pricePerDayCat: decimal("price_per_day_cat", { precision: 6, scale: 2 }),
    pricePerDayDog: decimal("price_per_day_dog", { precision: 6, scale: 2 }),
    // Services proposés : jsonb pour rester flexible sans migration à chaque
    // nouveau service (ex. { medication, outdoorAccess, nightStaff, transport }).
    services: jsonb(),
    openingHours: text("opening_hours"),
    // Vérification manuelle par un platform_admin — contrôle du SIRET, de
    // l'agrément, et de l'authenticité du compte.
    isVerified: boolean("is_verified").default(false).notNull(),
    isDemo: boolean("is_demo").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("pensions_slug_idx").on(table.slug),
    index("pensions_location_idx").using("gist", table.location),
    index("pensions_verified_idx").on(table.isVerified),
  ]
);

export const pensionPhotos = pgTable(
  "pension_photos",
  {
    id: uuid().primaryKey().defaultRandom(),
    pensionId: uuid("pension_id")
      .notNull()
      .references(() => pensions.id, { onDelete: "cascade" }),
    url: text().notNull(),
    blurDataUrl: text("blur_data_url"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    order: integer().default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("pension_photos_pension_idx").on(table.pensionId)]
);

// ─── Tracking & avis ──────────────────────────────────────────────────────

export const pensionContactActionEnum = pgEnum("pension_contact_action", [
  "call",
  "email",
  "website",
]);

/**
 * Trace anonymisée d'une action de contact (appel, email, visite du site).
 * Le numéro composé n'est jamais stocké : on garde uniquement (pension, user,
 * action). Sert de :
 *   - compteur d'engagement publié sur la fiche
 *   - garde-fou pour la vérification des avis (un avis n'est "vérifié" que
 *     si l'auteur a un événement de contact pour cette pension dans les
 *     90 derniers jours avant l'avis).
 */
export const pensionContactEvents = pgTable(
  "pension_contact_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    pensionId: uuid("pension_id")
      .notNull()
      .references(() => pensions.id, { onDelete: "cascade" }),
    // Nullable : on accepte un compteur même si l'utilisateur n'est pas
    // connecté (plus tard utile pour stats anonymes).
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: pensionContactActionEnum().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("pension_contact_events_pension_idx").on(
      table.pensionId,
      table.createdAt
    ),
    index("pension_contact_events_user_idx").on(
      table.userId,
      table.pensionId,
      table.createdAt
    ),
  ]
);

/**
 * Avis utilisateurs sur une pension. Note 1-5 + commentaire libre.
 *
 * - `isVerified` : l'auteur avait un événement de contact pour cette
 *   pension dans les 90 jours précédant l'avis. Calculé à la création.
 * - `isPublished` : flag de modération. Par défaut `true` (on publie de
 *   suite, modération a posteriori).
 * - Un user ne peut laisser qu'un avis par pension (unique index).
 */
export const pensionReviews = pgTable(
  "pension_reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    pensionId: uuid("pension_id")
      .notNull()
      .references(() => pensions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: smallint().notNull(),
    comment: text(),
    isVerified: boolean("is_verified").default(false).notNull(),
    isPublished: boolean("is_published").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("pension_reviews_pension_user_idx").on(
      table.pensionId,
      table.userId
    ),
    index("pension_reviews_pension_published_idx").on(
      table.pensionId,
      table.isPublished
    ),
  ]
);
