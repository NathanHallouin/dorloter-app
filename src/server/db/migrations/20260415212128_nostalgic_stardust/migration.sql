CREATE TYPE "age_category" AS ENUM('chaton', 'jeune', 'adulte', 'senior');--> statement-breakpoint
CREATE TYPE "application_status" AS ENUM('envoyee', 'en_cours', 'acceptee', 'refusee', 'annulee');--> statement-breakpoint
CREATE TYPE "cat_status" AS ENUM('disponible', 'reserve', 'adopte', 'retire');--> statement-breakpoint
CREATE TYPE "compatibility" AS ENUM('oui', 'non', 'inconnu');--> statement-breakpoint
CREATE TYPE "fiv_felv" AS ENUM('negatif', 'fiv_positif', 'felv_positif', 'fiv_felv_positif', 'non_teste');--> statement-breakpoint
CREATE TYPE "housing_type" AS ENUM('appartement', 'maison', 'autre');--> statement-breakpoint
CREATE TYPE "match_status" AS ENUM('suggere', 'confirme', 'rejete');--> statement-breakpoint
CREATE TYPE "notification_type" AS ENUM('match_found', 'application_update', 'new_cat_nearby', 'report_nearby');--> statement-breakpoint
CREATE TYPE "report_status" AS ENUM('actif', 'resolu', 'expire');--> statement-breakpoint
CREATE TYPE "report_type" AS ENUM('perdu', 'trouve');--> statement-breakpoint
CREATE TYPE "sex" AS ENUM('male', 'femelle', 'inconnu');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('user', 'shelter_admin', 'platform_admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" varchar(255) PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"password" text
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"cat_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'envoyee'::"application_status" NOT NULL,
	"housing_type" "housing_type",
	"has_outdoor_access" boolean DEFAULT false,
	"has_other_pets" text,
	"has_children" boolean DEFAULT false,
	"children_ages" text,
	"experience" text,
	"motivation" text NOT NULL,
	"availability" text,
	"shelter_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"cat_id" uuid NOT NULL,
	"url" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"shelter_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"breed" varchar(100),
	"color" varchar(100),
	"sex" "sex" DEFAULT 'inconnu'::"sex" NOT NULL,
	"age_category" "age_category",
	"estimated_birth" date,
	"is_sterilized" boolean DEFAULT false NOT NULL,
	"is_chipped" boolean DEFAULT false NOT NULL,
	"is_vaccinated" boolean DEFAULT false NOT NULL,
	"fiv_felv" "fiv_felv" DEFAULT 'non_teste'::"fiv_felv" NOT NULL,
	"ok_with_cats" "compatibility" DEFAULT 'inconnu'::"compatibility" NOT NULL,
	"ok_with_dogs" "compatibility" DEFAULT 'inconnu'::"compatibility" NOT NULL,
	"ok_with_children" "compatibility" DEFAULT 'inconnu'::"compatibility" NOT NULL,
	"indoor_only" boolean DEFAULT false NOT NULL,
	"special_needs" text,
	"status" "cat_status" DEFAULT 'disponible'::"cat_status" NOT NULL,
	"adoption_fee" numeric(8,2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid,
	"cat_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_pkey" PRIMARY KEY("user_id","cat_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"data" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"lost_report_id" uuid NOT NULL,
	"found_report_id" uuid NOT NULL,
	"score" numeric(5,2) NOT NULL,
	"distance_meters" integer,
	"status" "match_status" DEFAULT 'suggere'::"match_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"report_id" uuid NOT NULL,
	"url" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"type" "report_type" NOT NULL,
	"status" "report_status" DEFAULT 'actif'::"report_status" NOT NULL,
	"cat_name" varchar(255),
	"description" text NOT NULL,
	"breed" varchar(100),
	"color" varchar(100),
	"sex" "sex" DEFAULT 'inconnu'::"sex" NOT NULL,
	"is_chipped" boolean DEFAULT false NOT NULL,
	"chip_number" varchar(50),
	"distinctive_signs" text,
	"location" geometry(point,4326) NOT NULL,
	"address" text,
	"date_event" date NOT NULL,
	"contact_phone" varchar(20),
	"contact_email" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(255) PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shelters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL UNIQUE,
	"description" text,
	"siret" varchar(14),
	"address" text,
	"location" geometry(point,4326),
	"phone" varchar(20),
	"email" varchar(255),
	"website" text,
	"logo_url" text,
	"cover_url" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" varchar(255) NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'user'::"user_role" NOT NULL,
	"shelter_id" uuid,
	"location" geometry(point,4326),
	"notification_radius_km" integer DEFAULT 10,
	"push_subscription" jsonb,
	"phone" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" varchar(255) PRIMARY KEY,
	"identifier" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "applications_cat_status_idx" ON "applications" ("cat_id","status");--> statement-breakpoint
CREATE INDEX "cats_shelter_id_idx" ON "cats" ("shelter_id");--> statement-breakpoint
CREATE INDEX "cats_status_idx" ON "cats" ("status");--> statement-breakpoint
CREATE INDEX "favorites_user_id_idx" ON "favorites" ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "report_matches_lost_idx" ON "report_matches" ("lost_report_id");--> statement-breakpoint
CREATE INDEX "report_matches_found_idx" ON "report_matches" ("found_report_id");--> statement-breakpoint
CREATE INDEX "reports_type_status_idx" ON "reports" ("type","status");--> statement-breakpoint
CREATE INDEX "reports_date_event_idx" ON "reports" ("date_event");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" ("email");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_cat_id_cats_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cat_photos" ADD CONSTRAINT "cat_photos_cat_id_cats_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cats" ADD CONSTRAINT "cats_shelter_id_shelters_id_fkey" FOREIGN KEY ("shelter_id") REFERENCES "shelters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_cat_id_cats_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "report_matches" ADD CONSTRAINT "report_matches_lost_report_id_reports_id_fkey" FOREIGN KEY ("lost_report_id") REFERENCES "reports"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "report_matches" ADD CONSTRAINT "report_matches_found_report_id_reports_id_fkey" FOREIGN KEY ("found_report_id") REFERENCES "reports"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "report_photos" ADD CONSTRAINT "report_photos_report_id_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;