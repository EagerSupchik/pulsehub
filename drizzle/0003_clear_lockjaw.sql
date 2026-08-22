CREATE TYPE "public"."event_registration_status" AS ENUM('registered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('published', 'cancelled');--> statement-breakpoint
CREATE TABLE "event_registration" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"status" "event_registration_status" DEFAULT 'registered' NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"kind" text DEFAULT 'Компания' NOT NULL,
	"location" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"capacity" integer NOT NULL,
	"status" "event_status" DEFAULT 'published' NOT NULL,
	"created_by_membership_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"green_minimum" integer DEFAULT 1000 NOT NULL,
	"yellow_minimum" integer DEFAULT 400 NOT NULL,
	"updated_by_membership_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_membership_id_company_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."company_membership"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_membership_id_company_membership_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."company_membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_settings" ADD CONSTRAINT "activity_settings_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_settings" ADD CONSTRAINT "activity_settings_updated_by_membership_id_company_membership_id_fk" FOREIGN KEY ("updated_by_membership_id") REFERENCES "public"."company_membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_registration_event_member_unique" ON "event_registration" USING btree ("event_id","membership_id");--> statement-breakpoint
CREATE INDEX "event_registration_member_idx" ON "event_registration" USING btree ("membership_id","status");--> statement-breakpoint
CREATE INDEX "event_company_starts_idx" ON "event" USING btree ("company_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_settings_company_unique" ON "activity_settings" USING btree ("company_id");