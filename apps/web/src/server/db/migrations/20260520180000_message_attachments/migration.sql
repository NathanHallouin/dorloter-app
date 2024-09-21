ALTER TABLE "messages" ALTER COLUMN "content" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_type" varchar(20);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_url" text;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_meta" jsonb;
