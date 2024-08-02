CREATE TYPE "pension_contact_action" AS ENUM ('call', 'email', 'website');
--> statement-breakpoint

CREATE TABLE "pension_contact_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pension_id" uuid NOT NULL,
  "user_id" uuid,
  "action" "pension_contact_action" NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX "pension_contact_events_pension_idx"
  ON "pension_contact_events" ("pension_id", "created_at");
--> statement-breakpoint

CREATE INDEX "pension_contact_events_user_idx"
  ON "pension_contact_events" ("user_id", "pension_id", "created_at");
--> statement-breakpoint

ALTER TABLE "pension_contact_events"
  ADD CONSTRAINT "pension_contact_events_pension_id_fkey"
  FOREIGN KEY ("pension_id") REFERENCES "pensions"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "pension_contact_events"
  ADD CONSTRAINT "pension_contact_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint

CREATE TABLE "pension_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pension_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "rating" smallint NOT NULL,
  "comment" text,
  "is_verified" boolean DEFAULT false NOT NULL,
  "is_published" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX "pension_reviews_pension_user_idx"
  ON "pension_reviews" ("pension_id", "user_id");
--> statement-breakpoint

CREATE INDEX "pension_reviews_pension_published_idx"
  ON "pension_reviews" ("pension_id", "is_published");
--> statement-breakpoint

ALTER TABLE "pension_reviews"
  ADD CONSTRAINT "pension_reviews_pension_id_fkey"
  FOREIGN KEY ("pension_id") REFERENCES "pensions"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "pension_reviews"
  ADD CONSTRAINT "pension_reviews_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "pension_reviews"
  ADD CONSTRAINT "pension_reviews_rating_check"
  CHECK ("rating" >= 1 AND "rating" <= 5);
