ALTER TYPE "notification_type" ADD VALUE 'new_message';--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"shelter_id" uuid NOT NULL,
	"cat_id" uuid,
	"subject" varchar(255),
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"last_message_preview" varchar(200),
	"last_sender_type" varchar(20),
	"user_unread_count" integer DEFAULT 0 NOT NULL,
	"shelter_unread_count" integer DEFAULT 0 NOT NULL,
	"archived_by_user" boolean DEFAULT false NOT NULL,
	"archived_by_shelter" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"conversation_id" uuid NOT NULL,
	"sender_type" varchar(20) NOT NULL,
	"sender_id" uuid,
	"content" text NOT NULL,
	"read_at" timestamp,
	"edited_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_context_idx" ON "conversations" ("user_id","shelter_id",COALESCE("cat_id", '00000000-0000-0000-0000-000000000000'::uuid));--> statement-breakpoint
CREATE INDEX "conversations_user_idx" ON "conversations" ("user_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_shelter_idx" ON "conversations" ("shelter_id","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "message_reactions_unique_idx" ON "message_reactions" ("message_id","user_id","emoji");--> statement-breakpoint
CREATE INDEX "message_reactions_message_idx" ON "message_reactions" ("message_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" ("conversation_id","created_at");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_shelter_id_shelters_id_fkey" FOREIGN KEY ("shelter_id") REFERENCES "shelters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_cat_id_cats_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL;