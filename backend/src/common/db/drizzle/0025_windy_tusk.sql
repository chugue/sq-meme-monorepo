CREATE TABLE "squid_meme"."user_quests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_wallet_address" varchar(42) NOT NULL,
	"quest_type" varchar(32) NOT NULL,
	"quest_title" varchar(100) NOT NULL,
	"is_eligible" boolean DEFAULT false NOT NULL,
	"is_claimed" boolean DEFAULT false NOT NULL,
	"eligible_at" timestamp,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "quest_user_wallet_idx" ON "squid_meme"."user_quests" USING btree ("user_wallet_address");--> statement-breakpoint
CREATE INDEX "quest_type_idx" ON "squid_meme"."user_quests" USING btree ("quest_type");--> statement-breakpoint
CREATE INDEX "user_quest_idx" ON "squid_meme"."user_quests" USING btree ("user_wallet_address","quest_type");--> statement-breakpoint
ALTER TABLE "squid_meme"."games" DROP COLUMN "token_image_url";