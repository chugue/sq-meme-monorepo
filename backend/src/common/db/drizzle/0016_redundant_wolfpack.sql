DROP INDEX "squid_meme"."game_idx";--> statement-breakpoint
DROP INDEX "squid_meme"."last_comment_idx";--> statement-breakpoint
ALTER TABLE "squid_meme"."comments" ALTER COLUMN "game_address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "squid_meme"."comments" ADD COLUMN "game_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX "game_id_idx" ON "squid_meme"."comments" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "last_comment_idx" ON "squid_meme"."comments" USING btree ("game_id","is_winner_comment");