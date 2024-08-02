CREATE TYPE "moderation_status" AS ENUM('en_attente', 'masque', 'rejete');--> statement-breakpoint
CREATE TYPE "reported_content_type" AS ENUM('cat', 'report', 'shelter', 'user');--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"reporter_id" uuid,
	"content_type" "reported_content_type" NOT NULL,
	"content_id" uuid NOT NULL,
	"reason" varchar(100) NOT NULL,
	"comment" text,
	"status" "moderation_status" DEFAULT 'en_attente'::"moderation_status" NOT NULL,
	"resolved_by_id" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "content_reports_status_idx" ON "content_reports" ("status");--> statement-breakpoint
CREATE INDEX "content_reports_content_idx" ON "content_reports" ("content_type","content_id");--> statement-breakpoint
CREATE INDEX "content_reports_reporter_idx" ON "content_reports" ("reporter_id");--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_resolved_by_id_users_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL;