CREATE TYPE "public"."shelter_visit_booking_status" AS ENUM(
  'en_attente',
  'confirme',
  'annule_par_refuge',
  'annule_par_user',
  'honore',
  'no_show'
);
--> statement-breakpoint
CREATE TABLE "shelter_visit_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shelter_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minutes" integer NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelter_visit_slots_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shelter_visit_slots_unique" ON "shelter_visit_slots" ("shelter_id","day_of_week","start_minutes");
--> statement-breakpoint
CREATE INDEX "shelter_visit_slots_shelter_idx" ON "shelter_visit_slots" ("shelter_id");
--> statement-breakpoint
CREATE TABLE "shelter_visit_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shelter_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"pet_id" uuid,
	"scheduled_for" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"status" "shelter_visit_booking_status" DEFAULT 'en_attente' NOT NULL,
	"user_notes" text,
	"shelter_notes" text,
	"reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelter_visit_bookings_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "shelter_visit_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "shelter_visit_bookings_shelter_idx" ON "shelter_visit_bookings" ("shelter_id","scheduled_for");
--> statement-breakpoint
CREATE INDEX "shelter_visit_bookings_user_idx" ON "shelter_visit_bookings" ("user_id");
--> statement-breakpoint
CREATE INDEX "shelter_visit_bookings_status_idx" ON "shelter_visit_bookings" ("status","scheduled_for");
--> statement-breakpoint
CREATE UNIQUE INDEX "shelter_visit_bookings_slot_unique" ON "shelter_visit_bookings" ("shelter_id","scheduled_for","user_id");
