CREATE TABLE "shelter_follows" (
	"user_id" uuid,
	"shelter_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelter_follows_pkey" PRIMARY KEY("user_id","shelter_id")
);
--> statement-breakpoint
ALTER TABLE "shelters" ADD COLUMN "mission_long" text;--> statement-breakpoint
ALTER TABLE "shelters" ADD COLUMN "founded_year" integer;--> statement-breakpoint
ALTER TABLE "shelters" ADD COLUMN "donation_url" text;--> statement-breakpoint
ALTER TABLE "shelters" ADD COLUMN "visit_hours" text;--> statement-breakpoint
CREATE INDEX "shelter_follows_shelter_idx" ON "shelter_follows" ("shelter_id");--> statement-breakpoint
ALTER TABLE "shelter_follows" ADD CONSTRAINT "shelter_follows_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shelter_follows" ADD CONSTRAINT "shelter_follows_shelter_id_shelters_id_fkey" FOREIGN KEY ("shelter_id") REFERENCES "shelters"("id") ON DELETE CASCADE;