CREATE TABLE "vet_report_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vet_id" uuid NOT NULL,
	"report_id" uuid NOT NULL,
	"distance_meters" integer NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"push_sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vet_report_alerts_vet_id_veterinarians_id_fk" FOREIGN KEY ("vet_id") REFERENCES "public"."veterinarians"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX "vet_report_alerts_vet_report_unique" ON "vet_report_alerts" ("vet_id","report_id");
--> statement-breakpoint
CREATE INDEX "vet_report_alerts_report_idx" ON "vet_report_alerts" ("report_id");
