ALTER TABLE "squid_meme"."games" ADD CONSTRAINT "games_game_id_unique" UNIQUE("game_id");
--> statement-breakpoint
CREATE TABLE "squid_meme"."winners" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"game_id" text NOT NULL,
	"prize" text NOT NULL,
	"token_symbol" varchar(32) NOT NULL,
	"token_address" varchar(42) NOT NULL,
	"claim_tx_hash" varchar(66),
	"claimed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "winner_wallet_idx" ON "squid_meme"."winners" USING btree ("wallet_address");
--> statement-breakpoint
CREATE INDEX "winner_game_idx" ON "squid_meme"."winners" USING btree ("game_id");
--> statement-breakpoint
CREATE INDEX "winner_token_idx" ON "squid_meme"."winners" USING btree ("token_address");
