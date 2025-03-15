ALTER TABLE "saved_searches"
  ADD COLUMN "push_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE INDEX "saved_searches_push_idx" ON "saved_searches" ("kind","is_active","push_enabled");
