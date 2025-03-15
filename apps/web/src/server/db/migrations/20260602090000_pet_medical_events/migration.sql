CREATE TYPE "public"."medical_event_type" AS ENUM(
  'vaccin',
  'vermifuge',
  'antiparasitaire',
  'consultation',
  'chirurgie',
  'traitement',
  'autre'
);
--> statement-breakpoint
CREATE TABLE "pet_medical_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pet_id" uuid NOT NULL,
	"type" "medical_event_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"notes" text,
	"event_date" date NOT NULL,
	"next_reminder_at" date,
	"vet_name_freeform" varchar(255),
	"attachment_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pet_medical_events_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "pet_medical_events_pet_idx" ON "pet_medical_events" ("pet_id","event_date");
--> statement-breakpoint
CREATE INDEX "pet_medical_events_reminder_idx" ON "pet_medical_events" ("next_reminder_at");
