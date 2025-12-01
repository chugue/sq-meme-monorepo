ALTER TABLE "squid_meme"."games" RENAME COLUMN "is_ended" TO "is_claimed";--> statement-breakpoint
DROP INDEX "squid_meme"."status_idx";--> statement-breakpoint
CREATE INDEX "claimed_idx" ON "squid_meme"."games" USING btree ("is_claimed");