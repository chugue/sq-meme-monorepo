ALTER TABLE "squid_meme"."games" ADD COLUMN "is_ended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "squid_meme"."games" ADD COLUMN "total_funding" text DEFAULT '0';--> statement-breakpoint
ALTER TABLE "squid_meme"."games" ADD COLUMN "funder_count" text DEFAULT '0';