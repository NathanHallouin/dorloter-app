CREATE TYPE "public"."shelter_document_kind" AS ENUM(
  'contrat_adoption',
  'statuts_association',
  'agrement',
  'convention',
  'charte_visite',
  'autre'
);
--> statement-breakpoint
CREATE TYPE "public"."shelter_document_visibility" AS ENUM('public', 'internal');
--> statement-breakpoint
CREATE TABLE "shelter_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shelter_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"kind" "shelter_document_kind" DEFAULT 'autre' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"file_mime_type" varchar(80),
	"file_size_bytes" integer,
	"visibility" "shelter_document_visibility" DEFAULT 'internal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelter_documents_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "shelter_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX "shelter_documents_shelter_idx" ON "shelter_documents" ("shelter_id","kind");
--> statement-breakpoint
CREATE INDEX "shelter_documents_public_idx" ON "shelter_documents" ("visibility","shelter_id");
