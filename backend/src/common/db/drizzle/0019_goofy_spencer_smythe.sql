DROP INDEX "squid_meme"."last_comment_idx";--> statement-breakpoint
CREATE INDEX "last_comment_idx" ON "squid_meme"."comments" USING btree ("game_id");--> statement-breakpoint
ALTER TABLE "squid_meme"."comments" DROP COLUMN "game_address";--> statement-breakpoint
ALTER TABLE "squid_meme"."comments" DROP COLUMN "end_time";--> statement-breakpoint
ALTER TABLE "squid_meme"."comments" DROP COLUMN "current_prize_pool";--> statement-breakpoint
ALTER TABLE "squid_meme"."comments" DROP COLUMN "is_winner_comment";