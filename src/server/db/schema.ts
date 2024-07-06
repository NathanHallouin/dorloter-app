import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { geometry } from "drizzle-orm/pg-core/columns/postgis_extension/geometry";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "shelter_admin",
  "platform_admin",
]);

export const sexEnum = pgEnum("sex", ["male", "femelle", "inconnu"]);

export const ageCategoryEnum = pgEnum("age_category", [
  "chaton",
  "jeune",
  "adulte",
  "senior",
]);

export const fivFelvEnum = pgEnum("fiv_felv", [
  "negatif",
  "fiv_positif",
  "felv_positif",
  "fiv_felv_positif",
  "non_teste",
]);

export const compatibilityEnum = pgEnum("compatibility", [
  "oui",
  "non",
  "inconnu",
]);

export const catStatusEnum = pgEnum("cat_status", [
  "disponible",
  "reserve",
  "adopte",
  "retire",
]);

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

export const applicationStatusEnum = pgEnum("application_status", [
  "envoyee",
  "en_cours",
  "acceptee",
  "refusee",
  "annulee",
]);

export const housingTypeEnum = pgEnum("housing_type", [
  "appartement",
  "maison",
  "autre",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "match_found",
  "application_update",
  "new_cat_nearby",
  "report_nearby",
]);

// ─── Tables auth (Better Auth) ──────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: varchar({ length: 255 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    name: varchar({ length: 255 }).notNull(),
    image: text(),
    role: userRoleEnum().default("user").notNull(),
    shelterId: uuid("shelter_id"),
    location: geometry({ type: "point", srid: 4326, mode: "xy" }),
    notificationRadiusKm: integer("notification_radius_km").default(10),
    pushSubscription: jsonb("push_subscription"),
    phone: varchar({ length: 20 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
  ]
);

export const sessions = pgTable("sessions", {
  id: varchar({ length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar({ length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: varchar({ length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  password: text(),
});

export const verifications = pgTable("verifications", {
  id: varchar({ length: 255 }).primaryKey(),
  identifier: varchar({ length: 255 }).notNull(),
  value: varchar({ length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Tables métier ──────────────────────────────────────────────────────────

export const shelters = pgTable("shelters", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).unique().notNull(),
  description: text(),
  siret: varchar({ length: 14 }),
  address: text(),
  location: geometry({ type: "point", srid: 4326, mode: "xy" }),
  phone: varchar({ length: 20 }),
  email: varchar({ length: 255 }),
  website: text(),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cats = pgTable(
  "cats",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    breed: varchar({ length: 100 }),
    color: varchar({ length: 100 }),
    sex: sexEnum().default("inconnu").notNull(),
    ageCategory: ageCategoryEnum("age_category"),
    estimatedBirth: date("estimated_birth"),
    isSterilized: boolean("is_sterilized").default(false).notNull(),
    isChipped: boolean("is_chipped").default(false).notNull(),
    isVaccinated: boolean("is_vaccinated").default(false).notNull(),
    fivFelv: fivFelvEnum("fiv_felv").default("non_teste").notNull(),
    okWithCats: compatibilityEnum("ok_with_cats").default("inconnu").notNull(),
    okWithDogs: compatibilityEnum("ok_with_dogs").default("inconnu").notNull(),
    okWithChildren: compatibilityEnum("ok_with_children")
      .default("inconnu")
      .notNull(),
    indoorOnly: boolean("indoor_only").default(false).notNull(),
    specialNeeds: text("special_needs"),
    status: catStatusEnum().default("disponible").notNull(),
    adoptionFee: decimal("adoption_fee", { precision: 8, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("cats_shelter_id_idx").on(table.shelterId),
    index("cats_status_idx").on(table.status),
  ]
);

export const catPhotos = pgTable("cat_photos", {
  id: uuid().primaryKey().defaultRandom(),
  catId: uuid("cat_id")
    .notNull()
    .references(() => cats.id, { onDelete: "cascade" }),
  url: text().notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  order: integer().default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable(
  "reports",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: reportTypeEnum().notNull(),
    status: reportStatusEnum().default("actif").notNull(),
    catName: varchar("cat_name", { length: 255 }),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("reports_type_status_idx").on(table.type, table.status),
    index("reports_date_event_idx").on(table.dateEvent),
  ]
);

export const reportPhotos = pgTable("report_photos", {
  id: uuid().primaryKey().defaultRandom(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  url: text().notNull(),
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

export const applications = pgTable(
  "applications",
  {
    id: uuid().primaryKey().defaultRandom(),
    catId: uuid("cat_id")
      .notNull()
      .references(() => cats.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: applicationStatusEnum().default("envoyee").notNull(),
    housingType: housingTypeEnum("housing_type"),
    hasOutdoorAccess: boolean("has_outdoor_access").default(false),
    hasOtherPets: text("has_other_pets"),
    hasChildren: boolean("has_children").default(false),
    childrenAges: text("children_ages"),
    experience: text(),
    motivation: text().notNull(),
    availability: text(),
    shelterNotes: text("shelter_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("applications_cat_status_idx").on(table.catId, table.status),
  ]
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    catId: uuid("cat_id")
      .notNull()
      .references(() => cats.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.catId] }),
    index("favorites_user_id_idx").on(table.userId),
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum().notNull(),
    title: varchar({ length: 255 }).notNull(),
    body: text(),
    data: jsonb(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_read_idx").on(table.userId, table.isRead),
  ]
);

