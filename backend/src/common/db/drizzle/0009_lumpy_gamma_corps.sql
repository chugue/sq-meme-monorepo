ALTER TABLE "squid_meme"."comments" ADD COLUMN "tx_hash" varchar(66);--> statement-breakpoint
ALTER TABLE "squid_meme"."comments" ADD CONSTRAINT "comments_tx_hash_unique" UNIQUE("tx_hash");