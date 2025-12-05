CREATE TABLE "squid_meme"."tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_address" varchar(42) NOT NULL,
	"token_image_url" text,
	"token_username" varchar(64) NOT NULL,
	"token_usertag" varchar(32) NOT NULL,
	"token_symbol" varchar(32),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tokens_token_address_unique" UNIQUE("token_address")
);
--> statement-breakpoint
CREATE INDEX "token_address_idx" ON "squid_meme"."tokens" USING btree ("token_address");--> statement-breakpoint
CREATE INDEX "token_username_tag_idx" ON "squid_meme"."tokens" USING btree ("token_username","token_usertag");