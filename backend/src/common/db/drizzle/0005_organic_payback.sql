ALTER TABLE "squid_meme"."games" ADD COLUMN "token_symbol" varchar(32);--> statement-breakpoint
ALTER TABLE "squid_meme"."games" ADD COLUMN "token_name" varchar(128);--> statement-breakpoint
CREATE INDEX "game_token_idx" ON "squid_meme"."games" USING btree ("game_token");