CREATE TYPE "public"."shelter_volunteer_status" AS ENUM(
  'candidature',
  'active',
  'pause',
  'refusee',
  'archive'
);
--> statement-breakpoint
CREATE TYPE "public"."shelter_shift_status" AS ENUM(
  'ouvert',
  'complet',
  'annule',
  'termine'
);
--> statement-breakpoint
CREATE TYPE "public"."shelter_shift_signup_status" AS ENUM(
  'inscrit',
  'confirme',
  'annule',
  'absent',
  'termine'
);
--> statement-breakpoint
CREATE TABLE "shelter_volunteers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"shelter_id" uuid NOT NULL,
	"status" "shelter_volunteer_status" DEFAULT 'candidature' NOT NULL,
	"skills" text,
	"availability" text,
	"motivation" text NOT NULL,
	"phone" varchar(20),
	"shelter_notes" text,
	"validated_at" timestamp,
	"validated_by_user_id" uuid,
	"rejected_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelter_volunteers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "shelter_volunteers_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "shelter_volunteers_validated_by_user_id_users_id_fk" FOREIGN KEY ("validated_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "shelter_volunteers_user_idx" ON "shelter_volunteers" ("user_id");
--> statement-breakpoint
CREATE INDEX "shelter_volunteers_shelter_status_idx" ON "shelter_volunteers" ("shelter_id","status");
--> statement-breakpoint
CREATE TABLE "shelter_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shelter_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"status" "shelter_shift_status" DEFAULT 'ouvert' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelter_shifts_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "shelter_shifts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "shelter_shifts_shelter_starts_idx" ON "shelter_shifts" ("shelter_id","starts_at");
--> statement-breakpoint
CREATE INDEX "shelter_shifts_status_starts_idx" ON "shelter_shifts" ("status","starts_at");
--> statement-breakpoint
CREATE TABLE "shelter_shift_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"volunteer_id" uuid NOT NULL,
	"shelter_id" uuid NOT NULL,
	"status" "shelter_shift_signup_status" DEFAULT 'inscrit' NOT NULL,
	"check_in_at" timestamp,
	"check_out_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelter_shift_signups_shift_id_shelter_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shelter_shifts"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "shelter_shift_signups_volunteer_id_shelter_volunteers_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."shelter_volunteers"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "shelter_shift_signups_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shelter_shift_signups_uniq" ON "shelter_shift_signups" ("shift_id","volunteer_id");
--> statement-breakpoint
CREATE INDEX "shelter_shift_signups_shift_idx" ON "shelter_shift_signups" ("shift_id","status");
--> statement-breakpoint
CREATE INDEX "shelter_shift_signups_volunteer_idx" ON "shelter_shift_signups" ("volunteer_id","status");
