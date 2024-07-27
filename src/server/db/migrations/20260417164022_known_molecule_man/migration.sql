CREATE TABLE "resolution_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"report_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "resolved_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "resolved_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "resolution_credits_unique_idx" ON "resolution_credits" ("report_id","user_id","role");--> statement-breakpoint
CREATE INDEX "resolution_credits_user_idx" ON "resolution_credits" ("user_id");--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_user_id_users_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "resolution_credits" ADD CONSTRAINT "resolution_credits_report_id_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resolution_credits" ADD CONSTRAINT "resolution_credits_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;