import { sql } from "drizzle-orm";
import {
  boolean,
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
import { users, shelters, pets } from "@/server/db/schema";

/**
 * Métadonnées d'attachement message — forme dépend de `attachment_type`.
 *
 * - `gif`   : URL renvoyée par Tenor (proxy /api/v1/gifs/search). Le `previewUrl`
 *             est la version "tinygif" affichée dans le picker ; `url` est la
 *             version finale rendue dans la bulle.
 * - `voice` : fichier audio uploadé sur S3 (presign), durée enregistrée à
 *             l'enregistrement pour afficher le timer sans charger l'audio.
 */
export type MessageAttachmentMeta =
  | {
      type: "gif";
      provider: "tenor";
      externalId: string;
      width: number;
      height: number;
      previewUrl: string;
    }
  | {
      type: "voice";
      durationMs: number;
      mimeType: string;
    };

// ─── Messagerie temps réel ──────────────────────────────────────────────────
// Voir docs/MESSAGING.md pour le design complet (SSE + event bus).

export const conversations = pgTable(
  "conversations",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shelterId: uuid("shelter_id")
      .notNull()
      .references(() => shelters.id, { onDelete: "cascade" }),
    // Contexte optionnel : la conversation porte sur un chat précis
    petId: uuid("pet_id").references(() => pets.id, { onDelete: "set null" }),
    subject: varchar({ length: 255 }),
    lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
    lastMessagePreview: varchar("last_message_preview", { length: 200 }),
    lastSenderType: varchar("last_sender_type", { length: 20 }),
    userUnreadCount: integer("user_unread_count").default(0).notNull(),
    shelterUnreadCount: integer("shelter_unread_count").default(0).notNull(),
    archivedByUser: boolean("archived_by_user").default(false).notNull(),
    archivedByShelter: boolean("archived_by_shelter").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Unicité par contexte : une seule conversation par (user, shelter, pet).
    // On COALESCE le cat_id null vers un UUID sentinelle pour que NULL ne
    // contourne pas la contrainte.
    uniqueIndex("conversations_context_idx").on(
      table.userId,
      table.shelterId,
      sql`COALESCE(${table.petId}, '00000000-0000-0000-0000-000000000000'::uuid)`
    ),
    index("conversations_user_idx").on(table.userId, table.lastMessageAt),
    index("conversations_shelter_idx").on(table.shelterId, table.lastMessageAt),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderType: varchar("sender_type", { length: 20 }).notNull(),
    senderId: uuid("sender_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // Texte facultatif depuis l'ajout des attachments (GIF / vocal). Au
    // moins un de `content` / `attachment_url` doit être renseigné — c'est
    // garanti côté service (pas de check constraint DB pour rester simple).
    content: text(),
    attachmentType: varchar("attachment_type", { length: 20 }),
    attachmentUrl: text("attachment_url"),
    attachmentMeta: jsonb("attachment_meta").$type<MessageAttachmentMeta>(),
    readAt: timestamp("read_at"),
    editedAt: timestamp("edited_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("messages_conversation_idx").on(
      table.conversationId,
      table.createdAt
    ),
  ]
);

export const messageReactions = pgTable(
  "message_reactions",
  {
    id: uuid().primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: varchar({ length: 10 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Un user ne peut pas réagir 2× avec le même emoji sur le même message.
    // Toggle natif via ON CONFLICT DO DELETE dans la server action.
    uniqueIndex("message_reactions_unique_idx").on(
      table.messageId,
      table.userId,
      table.emoji
    ),
    index("message_reactions_message_idx").on(table.messageId),
  ]
);
