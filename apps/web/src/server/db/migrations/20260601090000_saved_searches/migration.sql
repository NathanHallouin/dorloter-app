CREATE TYPE "public"."saved_search_kind" AS ENUM('adoption', 'lost-found');
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "saved_search_kind" NOT NULL,
	"name" varchar(120) NOT NULL,
	"params" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "saved_searches_user_idx" ON "saved_searches" ("user_id","kind");
--> statement-breakpoint
CREATE INDEX "saved_searches_active_idx" ON "saved_searches" ("is_active","kind");
