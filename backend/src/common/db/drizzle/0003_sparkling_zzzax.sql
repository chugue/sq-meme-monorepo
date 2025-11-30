CREATE TABLE "squid_meme"."comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_address" varchar(42) NOT NULL,
	"commentor" varchar(42) NOT NULL,
	"message" text NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"end_time" timestamp NOT NULL,
	"current_prize_pool" text NOT NULL,
	"is_winner_comment" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "game_idx" ON "squid_meme"."comments" USING btree ("game_address");--> statement-breakpoint
CREATE INDEX "last_comment_idx" ON "squid_meme"."comments" USING btree ("game_address","is_winner_comment");