import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { geometry } from "drizzle-orm/pg-core/columns/postgis_extension/geometry";
import { users } from "@/server/db/schema";

export const shelters = pgTable(
  "shelters",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).unique().notNull(),
    description: text(),
    missionLong: text("mission_long"),
    siret: varchar({ length: 14 }),
    foundedYear: integer("founded_year"),
    address: text(),
    location: geometry({ type: "point", srid: 4326, mode: "xy" }),
    phone: varchar({ length: 20 }),
    email: varchar({ length: 255 }),
    website: text(),
    donationUrl: text("donation_url"),
    visitHours: text("visit_hours"),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    isVerified: boolean("is_verified").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("shelters_location_idx").using("gist", table.location),
  ]
);

export const shelterFollows = pgTable(
  "shelter_follows",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.shelterId] }),
    index("shelter_follows_shelter_idx").on(table.shelterId),
  ]
);

export const shelterInvitations = pgTable(
  "shelter_invitations",
  {
    id: uuid().primaryKey().defaultRandom(),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    invitedById: uuid("invited_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar({ length: 255 }).notNull(),
    token: varchar({ length: 255 }).notNull(),
    status: varchar({ length: 20 }).notNull().default("en_attente"),
    acceptedAt: timestamp("accepted_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shelter_invitations_token_idx").on(table.token),
    index("shelter_invitations_shelter_id_idx").on(table.shelterId),
    index("shelter_invitations_email_idx").on(table.email),
  ]
);
