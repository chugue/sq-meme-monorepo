CREATE TABLE "squid_meme"."users" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"user_name" varchar(64),
	"user_tag" varchar(32),
	"profile_image" text,
	"memex_link" text,
	"m_token_balance" text DEFAULT '0' NOT NULL,
	"my_token_balance" text DEFAULT '0' NOT NULL,
	"other_token_balances" json DEFAULT '[]'::json,
	"check_in_history" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE INDEX "user_wallet_idx" ON "squid_meme"."users" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "user_name_idx" ON "squid_meme"."users" USING btree ("user_name");