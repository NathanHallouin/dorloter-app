ALTER TABLE "accounts" DROP COLUMN IF EXISTS "expires_at";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "id_token" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "access_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "refresh_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "scope" varchar(255);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
