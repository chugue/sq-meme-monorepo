ALTER TABLE "squid_meme"."games" ADD COLUMN "tx_hash" varchar(66);--> statement-breakpoint
ALTER TABLE "squid_meme"."games" ADD CONSTRAINT "games_tx_hash_unique" UNIQUE("tx_hash");