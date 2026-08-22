CREATE TYPE "public"."bonus_redemption_status" AS ENUM('requested', 'approved', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."bonus_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "bonus_item" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	"emoji" text DEFAULT '✦' NOT NULL,
	"tint" text DEFAULT 'blue' NOT NULL,
	"stock" integer,
	"status" "bonus_status" DEFAULT 'active' NOT NULL,
	"created_by_membership_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bonus_redemption" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"bonus_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"price" integer NOT NULL,
	"status" "bonus_redemption_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bonus_item" ADD CONSTRAINT "bonus_item_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_item" ADD CONSTRAINT "bonus_item_created_by_membership_id_company_membership_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."company_membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_redemption" ADD CONSTRAINT "bonus_redemption_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_redemption" ADD CONSTRAINT "bonus_redemption_bonus_id_bonus_item_id_fk" FOREIGN KEY ("bonus_id") REFERENCES "public"."bonus_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_redemption" ADD CONSTRAINT "bonus_redemption_membership_id_company_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."company_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bonus_item_company_status_idx" ON "bonus_item" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "bonus_redemption_company_created_idx" ON "bonus_redemption" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "bonus_redemption_member_created_idx" ON "bonus_redemption" USING btree ("membership_id","created_at");