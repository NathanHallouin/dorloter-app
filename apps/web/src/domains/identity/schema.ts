import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { geometry } from "drizzle-orm/pg-core/columns/postgis_extension/geometry";
import { shelters } from "@shelters/schema";
import { pensions } from "@pensions/schema";
import { veterinarians } from "@veterinarians/schema";

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "shelter_admin",
  "pension_admin",
  "veterinarian_admin",
  "platform_admin",
]);

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: varchar({ length: 255 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    name: varchar({ length: 255 }).notNull(),
    image: text(),
    role: userRoleEnum().default("user").notNull(),
    shelterId: uuid("shelter_id").references(() => shelters.id, {
      onDelete: "set null",
    }),
    pensionId: uuid("pension_id").references(() => pensions.id, {
      onDelete: "set null",
    }),
    vetId: uuid("vet_id").references(() => veterinarians.id, {
      onDelete: "set null",
    }),
    location: geometry({ type: "point", srid: 4326, mode: "xy" }),
    notificationRadiusKm: integer("notification_radius_km").default(10),
    /**
     * Préférences granulaires par type de notification, séparées par canal.
     * Forme : { match_found: { push: true, email: true }, ... }.
     * Si une clé n'est pas définie, la valeur par défaut s'applique
     * (cf. DEFAULT_NOTIFICATION_PREFERENCES dans le domaine notifications).
     */
    notificationPreferences: jsonb("notification_preferences"),
    pushSubscription: jsonb("push_subscription"),
    phone: varchar({ length: 20 }),
    // Compteur "retrouvailles confirmées" alimenté par resolution_credits.
    // Affiché sur le profil public via UserBadge.
    resolvedCount: integer("resolved_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    index("users_location_idx").using("gist", table.location),
  ]
);

// ─── Tables Better Auth ─────────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
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
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: varchar({ length: 255 }),
  password: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verifications = pgTable("verifications", {
  id: uuid().primaryKey().defaultRandom(),
  identifier: varchar({ length: 255 }).notNull(),
  value: text().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Recherches sauvegardées (alertes adoption + perdus/trouvés) ──────────

export const savedSearchKindEnum = pgEnum("saved_search_kind", [
  "adoption",
  "lost-found",
]);

/**
 * Recherches sauvegardées par un utilisateur sur les listings publics
 * (catalogue adoption, signalements perdus/trouvés). Un cron quotidien
 * compare les paramètres aux nouvelles publications postérieures à
 * `last_notified_at` et envoie un email digest si match.
 *
 * `params` jsonb contient les query params bruts du listing (forme
 * normalisée par domaine). Pas de FK ni de contraintes typage côté DB
 * pour éviter une migration à chaque évolution des filtres.
 */
export const savedSearches = pgTable(
  "saved_searches",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: savedSearchKindEnum().notNull(),
    name: varchar({ length: 120 }).notNull(),
    params: jsonb().notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    /**
     * Pour les recherches de type `lost-found` uniquement : si activé,
     * l'utilisateur reçoit une notification push **immédiate** à la
     * publication d'un nouveau signalement qui matche ses critères
     * (mode « guetteur de quartier »). Indépendant du digest email.
     */
    pushEnabled: boolean("push_enabled").default(false).notNull(),
    lastNotifiedAt: timestamp("last_notified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("saved_searches_user_idx").on(table.userId, table.kind),
    index("saved_searches_active_idx").on(table.isActive, table.kind),
    index("saved_searches_push_idx").on(
      table.kind,
      table.isActive,
      table.pushEnabled
    ),
  ]
);
