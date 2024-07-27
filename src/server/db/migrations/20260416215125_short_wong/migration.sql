CREATE TABLE "shelter_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"shelter_id" uuid NOT NULL,
	"invited_by_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'en_attente' NOT NULL,
	"accepted_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shelter_invitations_token_idx" ON "shelter_invitations" ("token");--> statement-breakpoint
CREATE INDEX "shelter_invitations_shelter_id_idx" ON "shelter_invitations" ("shelter_id");--> statement-breakpoint
CREATE INDEX "shelter_invitations_email_idx" ON "shelter_invitations" ("email");--> statement-breakpoint
ALTER TABLE "shelter_invitations" ADD CONSTRAINT "shelter_invitations_shelter_id_shelters_id_fkey" FOREIGN KEY ("shelter_id") REFERENCES "shelters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shelter_invitations" ADD CONSTRAINT "shelter_invitations_invited_by_id_users_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE;