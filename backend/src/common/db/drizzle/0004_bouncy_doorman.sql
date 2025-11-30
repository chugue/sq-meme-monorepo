CREATE TABLE "squid_meme"."comment_likes" (
	"id" serial NOT NULL,
	"comment_id" serial NOT NULL,
	"user_address" varchar(42) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comment_likes_comment_id_user_address_pk" PRIMARY KEY("comment_id","user_address")
);
--> statement-breakpoint
ALTER TABLE "squid_meme"."comment_likes" ADD CONSTRAINT "comment_likes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "squid_meme"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_like_comment_idx" ON "squid_meme"."comment_likes" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_like_user_idx" ON "squid_meme"."comment_likes" USING btree ("user_address");