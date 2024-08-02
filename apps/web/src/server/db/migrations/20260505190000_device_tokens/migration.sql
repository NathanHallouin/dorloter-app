CREATE TYPE "public"."device_platform" AS ENUM('ios', 'android');
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expo_push_token" text NOT NULL,
	"platform" "device_platform" NOT NULL,
	"device_name" varchar(255),
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_user_token_uniq" ON "device_tokens" ("user_id","expo_push_token");
--> statement-breakpoint
CREATE INDEX "device_tokens_user_idx" ON "device_tokens" ("user_id");
