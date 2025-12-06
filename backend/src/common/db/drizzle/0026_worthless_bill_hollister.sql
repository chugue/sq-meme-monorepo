ALTER TABLE "squid_meme"."users" ADD COLUMN "total_comments" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "squid_meme"."user_quests" ADD COLUMN "description" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "squid_meme"."user_quests" ADD COLUMN "current_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "squid_meme"."user_quests" ADD COLUMN "target_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "squid_meme"."user_quests" DROP COLUMN "is_eligible";--> statement-breakpoint
ALTER TABLE "squid_meme"."user_quests" DROP COLUMN "eligible_at";