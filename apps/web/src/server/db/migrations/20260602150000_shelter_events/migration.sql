CREATE TYPE "public"."shelter_event_type" AS ENUM(
  'portes_ouvertes',
  'collecte',
  'salon',
  'rencontre',
  'urgence_appel',
  'autre'
);
--> statement-breakpoint
CREATE TABLE "shelter_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shelter_id" uuid NOT NULL,
	"type" "shelter_event_type" DEFAULT 'autre' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp,
	"venue_address" text,
	"location" geometry(point, 4326),
	"external_url" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelter_events_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "shelter_events_shelter_idx" ON "shelter_events" ("shelter_id","starts_at");
--> statement-breakpoint
CREATE INDEX "shelter_events_published_idx" ON "shelter_events" ("is_published","starts_at");
--> statement-breakpoint
CREATE INDEX "shelter_events_location_idx" ON "shelter_events" USING gist ("location");
