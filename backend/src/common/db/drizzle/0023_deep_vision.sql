CREATE TABLE "squid_meme"."funders" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"funder_address" varchar(42) NOT NULL,
	"total_funding" text NOT NULL,
	"tx_hashes" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "funders_game_id_idx" ON "squid_meme"."funders" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "funders_funder_address_idx" ON "squid_meme"."funders" USING btree ("funder_address");--> statement-breakpoint
CREATE INDEX "funders_game_funder_idx" ON "squid_meme"."funders" USING btree ("game_id","funder_address");