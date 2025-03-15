ALTER TABLE "pets"
  ADD COLUMN "campaign_url" text,
  ADD COLUMN "campaign_title" varchar(120),
  ADD COLUMN "campaign_description" text,
  ADD COLUMN "campaign_goal_amount" numeric(8, 2),
  ADD COLUMN "campaign_collected_amount" numeric(8, 2);
