import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "@/server/db/schema";

export const reportedContentTypeEnum = pgEnum("reported_content_type", [
  "pet",
  "report",
  "shelter",
  "user",
]);

export const moderationStatusEnum = pgEnum("moderation_status", [
  "en_attente",
  "masque",
  "rejete",
]);

export const contentReports = pgTable(
  "content_reports",
  {
    id: uuid().primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    contentType: reportedContentTypeEnum("content_type").notNull(),
    contentId: uuid("content_id").notNull(),
    reason: varchar({ length: 100 }).notNull(),
    comment: text(),
    status: moderationStatusEnum().default("en_attente").notNull(),
    resolvedById: uuid("resolved_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("content_reports_status_idx").on(table.status),
    index("content_reports_content_idx").on(table.contentType, table.contentId),
    index("content_reports_reporter_idx").on(table.reporterId),
  ]
);
