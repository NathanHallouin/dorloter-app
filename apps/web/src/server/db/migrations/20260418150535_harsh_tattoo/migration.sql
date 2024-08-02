CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"cat_id" uuid NOT NULL,
	"content" text NOT NULL,
	"photo_url" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "testimonials_user_cat_idx" ON "testimonials" ("user_id","cat_id");--> statement-breakpoint
CREATE INDEX "testimonials_cat_idx" ON "testimonials" ("cat_id","is_published");--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_cat_id_cats_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats"("id") ON DELETE CASCADE;