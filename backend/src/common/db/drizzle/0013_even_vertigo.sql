ALTER TABLE "squid_meme"."users" ADD COLUMN "memex_wallet_address" varchar(42);--> statement-breakpoint
ALTER TABLE "squid_meme"."users" ADD COLUMN "my_token_addr" varchar(42);--> statement-breakpoint
ALTER TABLE "squid_meme"."users" ADD COLUMN "my_token_symbol" varchar(32);--> statement-breakpoint
ALTER TABLE "squid_meme"."users" ADD COLUMN "is_policy_agreed" boolean DEFAULT false NOT NULL;