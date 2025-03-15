CREATE TABLE "pet_sponsorships" (
	"pet_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message" varchar(280),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pet_sponsorships_pet_id_user_id_pk" PRIMARY KEY ("pet_id","user_id"),
	CONSTRAINT "pet_sponsorships_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "pet_sponsorships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "pet_sponsorships_user_idx" ON "pet_sponsorships" ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "pet_sponsorships_pet_idx" ON "pet_sponsorships" ("pet_id","created_at");
