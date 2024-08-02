CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE INDEX "reports_location_idx" ON "reports" USING gist ("location");--> statement-breakpoint
CREATE INDEX "shelters_location_idx" ON "shelters" USING gist ("location");--> statement-breakpoint
CREATE INDEX "users_location_idx" ON "users" USING gist ("location");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_shelter_id_shelters_id_fkey" FOREIGN KEY ("shelter_id") REFERENCES "shelters"("id") ON DELETE SET NULL;