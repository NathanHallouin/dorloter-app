CREATE TYPE "public"."shelter_newsletter_kind" AS ENUM(
  'general',
  'nouvel_arrivage',
  'urgence_fa',
  'appel_dons',
  'evenement'
);
--> statement-breakpoint
CREATE TABLE "shelter_newsletters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shelter_id" uuid NOT NULL,
	"sent_by_user_id" uuid NOT NULL,
	"kind" "shelter_newsletter_kind" DEFAULT 'general' NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelter_newsletters_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "shelter_newsletters_sent_by_user_id_users_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "shelter_newsletters_shelter_idx" ON "shelter_newsletters" ("shelter_id","sent_at");
