CREATE TYPE "public"."adoption_followup_stage" AS ENUM('j15', 'j90', 'j365');
--> statement-breakpoint
CREATE TYPE "public"."adoption_followup_status" AS ENUM('pending', 'sent', 'skipped');
--> statement-breakpoint
CREATE TABLE "adoption_followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"pet_id" uuid NOT NULL,
	"shelter_id" uuid NOT NULL,
	"stage" "adoption_followup_stage" NOT NULL,
	"status" "adoption_followup_status" DEFAULT 'pending' NOT NULL,
	"due_at" timestamp NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adoption_followups_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "adoption_followups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "adoption_followups_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "adoption_followups_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX "adoption_followups_application_stage_idx" ON "adoption_followups" ("application_id","stage");
--> statement-breakpoint
CREATE INDEX "adoption_followups_due_idx" ON "adoption_followups" ("status","due_at");
--> statement-breakpoint
CREATE INDEX "adoption_followups_application_idx" ON "adoption_followups" ("application_id");
