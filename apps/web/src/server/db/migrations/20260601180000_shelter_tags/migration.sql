CREATE TYPE "public"."shelter_tag_color" AS ENUM(
  'coral',
  'lavande',
  'ambre',
  'vert',
  'bleu',
  'prune',
  'sable'
);
--> statement-breakpoint
CREATE TABLE "shelter_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shelter_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"color" "shelter_tag_color" DEFAULT 'coral' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelter_tags_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shelter_tags_shelter_name_unique" ON "shelter_tags" ("shelter_id","name");
--> statement-breakpoint
CREATE INDEX "shelter_tags_shelter_idx" ON "shelter_tags" ("shelter_id","position");
--> statement-breakpoint
CREATE TABLE "pet_tag_assignments" (
	"pet_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pet_tag_assignments_pet_id_tag_id_pk" PRIMARY KEY ("pet_id","tag_id"),
	CONSTRAINT "pet_tag_assignments_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "pet_tag_assignments_tag_id_shelter_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."shelter_tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "pet_tag_assignments_tag_idx" ON "pet_tag_assignments" ("tag_id");
