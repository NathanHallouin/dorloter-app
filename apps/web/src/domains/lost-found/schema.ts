import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { geometry } from "drizzle-orm/pg-core/columns/postgis_extension/geometry";
import { users } from "@/server/db/schema";
import { sexEnum } from "@infra/db/enums";
import { speciesEnum } from "@adoption/schema";

export const reportTypeEnum = pgEnum("report_type", ["perdu", "trouve"]);

export const reportStatusEnum = pgEnum("report_status", [
  "actif",
  "resolu",
  "expire",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "suggere",
  "confirme",
  "rejete",
]);

export const reports = pgTable(
  "reports",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: reportTypeEnum().notNull(),
    status: reportStatusEnum().default("actif").notNull(),
    species: speciesEnum().notNull(),
    petName: varchar("pet_name", { length: 255 }),
    description: text().notNull(),
    breed: varchar({ length: 100 }),
    color: varchar({ length: 100 }),
    sex: sexEnum().default("inconnu").notNull(),
    isChipped: boolean("is_chipped").default(false).notNull(),
    chipNumber: varchar("chip_number", { length: 50 }),
    distinctiveSigns: text("distinctive_signs"),
    location: geometry({ type: "point", srid: 4326, mode: "xy" }).notNull(),
    address: text(),
    dateEvent: date("date_event").notNull(),
    contactPhone: varchar("contact_phone", { length: 20 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    notes: text(),
    // Marqueurs de résolution (gamification) — renseignés quand l'auteur
    // confirme que l'animal a été retrouvé.
    resolvedAt: timestamp("resolved_at"),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("reports_type_status_idx").on(table.type, table.status),
    index("reports_date_event_idx").on(table.dateEvent),
    index("reports_location_idx").using("gist", table.location),
  ]
);

export const reportPhotos = pgTable("report_photos", {
  id: uuid().primaryKey().defaultRandom(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  url: text().notNull(),
  blurDataUrl: text("blur_data_url"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  order: integer().default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reportMatches = pgTable(
  "report_matches",
  {
    id: uuid().primaryKey().defaultRandom(),
    lostReportId: uuid("lost_report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    foundReportId: uuid("found_report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    score: decimal({ precision: 5, scale: 2 }).notNull(),
    distanceMeters: integer("distance_meters"),
    status: matchStatusEnum().default("suggere").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("report_matches_lost_idx").on(table.lostReportId),
    index("report_matches_found_idx").on(table.foundReportId),
  ]
);
