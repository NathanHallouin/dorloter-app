import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users, reports } from "@/server/db/schema";

/**
 * Credits attribués à un user quand un signalement se résout.
 * Un user peut recevoir un crédit par rôle par signalement :
 *   - 'author' : auteur du signalement résolu
 *   - 'matcher' : auteur du signalement opposé dans une correspondance confirmée
 * La contrainte unique (report_id, user_id, role) empêche le double-comptage.
 */
export const resolutionCredits = pgTable(
  "resolution_credits",
  {
    id: uuid().primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar({ length: 20 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("resolution_credits_unique_idx").on(
      table.reportId,
      table.userId,
      table.role
    ),
    index("resolution_credits_user_idx").on(table.userId),
  ]
);
