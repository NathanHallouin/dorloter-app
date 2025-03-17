CREATE TYPE "public"."shelter_news_post_type" AS ENUM(
  'adoption',
  'evenement',
  'urgence',
  'temoignage',
  'autre'
);
--> statement-breakpoint
CREATE TYPE "public"."shelter_news_post_status" AS ENUM(
  'brouillon',
  'en_attente_modo',
  'publie',
  'refuse',
  'archive'
);
--> statement-breakpoint
CREATE TABLE "shelter_news_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shelter_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"type" "shelter_news_post_type" DEFAULT 'autre' NOT NULL,
	"status" "shelter_news_post_status" DEFAULT 'brouillon' NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"excerpt" varchar(500),
	"body" text NOT NULL,
	"cover_url" text,
	"published_at" timestamp,
	"rejected_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelter_news_posts_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "shelter_news_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shelter_news_posts_slug_idx" ON "shelter_news_posts" ("slug");
--> statement-breakpoint
CREATE INDEX "shelter_news_posts_shelter_idx" ON "shelter_news_posts" ("shelter_id","published_at");
--> statement-breakpoint
CREATE INDEX "shelter_news_posts_status_idx" ON "shelter_news_posts" ("status","published_at");
--> statement-breakpoint
CREATE INDEX "shelter_news_posts_type_idx" ON "shelter_news_posts" ("type","published_at");
