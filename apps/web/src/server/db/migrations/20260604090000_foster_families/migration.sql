CREATE TYPE "public"."foster_family_status" AS ENUM(
  'candidature',
  'active',
  'pause',
  'refusee',
  'archive'
);
--> statement-breakpoint
CREATE TYPE "public"."pet_foster_placement_status" AS ENUM(
  'planifie',
  'en_cours',
  'termine',
  'annule'
);
--> statement-breakpoint
CREATE TABLE "foster_families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"shelter_id" uuid NOT NULL,
	"status" "foster_family_status" DEFAULT 'candidature' NOT NULL,
	"accepts_cats" boolean DEFAULT true NOT NULL,
	"accepts_dogs" boolean DEFAULT true NOT NULL,
	"max_capacity" integer DEFAULT 1 NOT NULL,
	"has_garden" boolean DEFAULT false NOT NULL,
	"has_other_pets" boolean DEFAULT false NOT NULL,
	"other_pets_description" text,
	"has_children" boolean DEFAULT false NOT NULL,
	"children_ages" text,
	"experience" text,
	"motivation" text NOT NULL,
	"address" text,
	"location" geometry(point, 4326),
	"phone" varchar(20),
	"shelter_notes" text,
	"validated_at" timestamp,
	"validated_by_user_id" uuid,
	"rejected_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "foster_families_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "foster_families_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "foster_families_validated_by_user_id_users_id_fk" FOREIGN KEY ("validated_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "foster_families_user_idx" ON "foster_families" ("user_id");
--> statement-breakpoint
CREATE INDEX "foster_families_shelter_status_idx" ON "foster_families" ("shelter_id","status");
--> statement-breakpoint
CREATE INDEX "foster_families_location_idx" ON "foster_families" USING gist ("location");
--> statement-breakpoint
CREATE TABLE "pet_foster_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pet_id" uuid NOT NULL,
	"foster_family_id" uuid NOT NULL,
	"shelter_id" uuid NOT NULL,
	"status" "pet_foster_placement_status" DEFAULT 'planifie' NOT NULL,
	"start_date" date NOT NULL,
	"expected_end_date" date,
	"actual_end_date" date,
	"reason" text,
	"shelter_notes" text,
	"foster_feedback" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pet_foster_placements_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "pet_foster_placements_foster_family_id_foster_families_id_fk" FOREIGN KEY ("foster_family_id") REFERENCES "public"."foster_families"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "pet_foster_placements_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "pet_foster_placements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "pet_foster_placements_pet_idx" ON "pet_foster_placements" ("pet_id","status");
--> statement-breakpoint
CREATE INDEX "pet_foster_placements_foster_idx" ON "pet_foster_placements" ("foster_family_id","status");
--> statement-breakpoint
CREATE INDEX "pet_foster_placements_shelter_idx" ON "pet_foster_placements" ("shelter_id","status");
