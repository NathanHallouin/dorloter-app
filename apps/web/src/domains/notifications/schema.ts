import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "@/server/db/schema";

export const notificationTypeEnum = pgEnum("notification_type", [
  "match_found",
  "application_update",
  "new_cat_nearby",
  "report_nearby",
  "new_message",
]);

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

export const devicePlatformEnum = pgEnum("device_platform", [
  "ios",
  "android",
]);

/**
 * Tokens de push natif Expo enregistrés par les apps mobile.
 *
 * Un user peut avoir plusieurs devices (iPhone + iPad + Android). On
 * dédoublonne sur (user_id, expo_push_token) — si l'app réenregistre le
 * même token (réinstallation, mise à jour OS), on update le `last_seen_at`
 * au lieu de dupliquer.
 *
 * Les tokens invalides (réponse Expo Push avec `DeviceNotRegistered`)
 * sont supprimés par le listener fanout — pas de fantômes en base.
 */
export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expoPushToken: text("expo_push_token").notNull(),
    platform: devicePlatformEnum().notNull(),
    deviceName: varchar("device_name", { length: 255 }),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("device_tokens_user_token_uniq").on(
      table.userId,
      table.expoPushToken
    ),
    index("device_tokens_user_idx").on(table.userId),
  ]
);
