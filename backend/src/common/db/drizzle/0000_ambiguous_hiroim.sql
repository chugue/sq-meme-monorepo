CREATE SCHEMA "squid_meme";
--> statement-breakpoint
CREATE TABLE "squid_meme"."games" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"game_address" varchar(42) NOT NULL,
	"game_token" varchar(42) NOT NULL,
	"initiator" varchar(42) NOT NULL,
	"remain_time" text NOT NULL,
	"end_time" timestamp NOT NULL,
	"cost" text NOT NULL,
	"prize_pool" text DEFAULT '0' NOT NULL,
	"is_ended" boolean DEFAULT false NOT NULL,
	"last_commentor" varchar(42) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "status_idx" ON "squid_meme"."games" USING btree ("is_ended");--> statement-breakpoint
CREATE INDEX "game_address_idx" ON "squid_meme"."games" USING btree ("game_address");