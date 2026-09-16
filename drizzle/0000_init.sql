CREATE TYPE "public"."option_source" AS ENUM('creator', 'suggestion');--> statement-breakpoint
CREATE TYPE "public"."poll_status" AS ENUM('open', 'settled');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."vote_type" AS ENUM('single', 'multi');--> statement-breakpoint
CREATE TABLE "ballots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"poll_id" uuid NOT NULL,
	"voter_token" text NOT NULL,
	"voter_name" text NOT NULL,
	"avatar_seed" text NOT NULL,
	"avatar_tint" text NOT NULL,
	"cast_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ballots_poll_voter_unique" UNIQUE("poll_id","voter_token")
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL,
	"source" "option_source" DEFAULT 'creator' NOT NULL,
	"suggestion_status" "suggestion_status",
	"suggested_by_name" text,
	"suggested_by_avatar_seed" text,
	"suggested_by_avatar_tint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "options_suggestion_fields_check" CHECK (("options"."source" = 'creator' AND "options"."suggestion_status" IS NULL)
        OR ("options"."source" = 'suggestion' AND "options"."suggestion_status" IS NOT NULL AND "options"."suggested_by_name" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"creator_id" text NOT NULL,
	"title" text NOT NULL,
	"vote_type" "vote_type" DEFAULT 'single' NOT NULL,
	"max_choices" integer DEFAULT 1 NOT NULL,
	"suggestions_enabled" boolean DEFAULT true NOT NULL,
	"status" "poll_status" DEFAULT 'open' NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "polls_slug_unique" UNIQUE("slug"),
	CONSTRAINT "polls_max_choices_check" CHECK ("polls"."max_choices" >= 1)
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"ballot_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	CONSTRAINT "votes_ballot_id_option_id_pk" PRIMARY KEY("ballot_id","option_id")
);
--> statement-breakpoint
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_ballot_id_ballots_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."ballots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_option_id_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "options_poll_idx" ON "options" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "polls_creator_idx" ON "polls" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "votes_option_idx" ON "votes" USING btree ("option_id");