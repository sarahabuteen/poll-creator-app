CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "options" ADD COLUMN "suggested_by_token" text;--> statement-breakpoint
CREATE INDEX "rate_limits_window_idx" ON "rate_limits" USING btree ("window_started_at");--> statement-breakpoint
CREATE INDEX "options_pending_by_token_idx" ON "options" USING btree ("poll_id","suggested_by_token");