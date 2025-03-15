CREATE TYPE "public"."pet_transfer_status" AS ENUM(
  'en_attente',
  'accepte',
  'refuse',
  'annule'
);
--> statement-breakpoint
CREATE TABLE "pet_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pet_id" uuid NOT NULL,
	"from_shelter_id" uuid NOT NULL,
	"to_shelter_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"message" text,
	"status" "pet_transfer_status" DEFAULT 'en_attente' NOT NULL,
	"decided_by_user_id" uuid,
	"decision_note" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"decided_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pet_transfers_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "pet_transfers_from_shelter_id_shelters_id_fk" FOREIGN KEY ("from_shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "pet_transfers_to_shelter_id_shelters_id_fk" FOREIGN KEY ("to_shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "pet_transfers_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "pet_transfers_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "pet_transfers_pet_idx" ON "pet_transfers" ("pet_id");
--> statement-breakpoint
CREATE INDEX "pet_transfers_from_idx" ON "pet_transfers" ("from_shelter_id","status");
--> statement-breakpoint
CREATE INDEX "pet_transfers_to_idx" ON "pet_transfers" ("to_shelter_id","status");
