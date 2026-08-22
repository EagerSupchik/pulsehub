CREATE TABLE "access_role_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_role" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_membership_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"provider" text DEFAULT 'openai' NOT NULL,
	"model" text DEFAULT 'gpt-5-mini' NOT NULL,
	"base_url" text,
	"system_prompt" text,
	"api_key_encrypted" text,
	"api_key_last4" text,
	"updated_by_membership_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"email_enabled" boolean DEFAULT false NOT NULL,
	"from_name" text DEFAULT 'PulseHub' NOT NULL,
	"reply_to" text,
	"task_assigned" boolean DEFAULT true NOT NULL,
	"task_due_soon" boolean DEFAULT true NOT NULL,
	"task_completed" boolean DEFAULT false NOT NULL,
	"event_registration" boolean DEFAULT true NOT NULL,
	"weekly_digest" boolean DEFAULT true NOT NULL,
	"digest_day" integer DEFAULT 1 NOT NULL,
	"event_recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_by_membership_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_role_assignment" ADD CONSTRAINT "access_role_assignment_role_id_access_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."access_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role_assignment" ADD CONSTRAINT "access_role_assignment_membership_id_company_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."company_membership"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role" ADD CONSTRAINT "access_role_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role" ADD CONSTRAINT "access_role_created_by_membership_id_company_membership_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."company_membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_updated_by_membership_id_company_membership_id_fk" FOREIGN KEY ("updated_by_membership_id") REFERENCES "public"."company_membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_updated_by_membership_id_company_membership_id_fk" FOREIGN KEY ("updated_by_membership_id") REFERENCES "public"."company_membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "access_role_assignment_unique" ON "access_role_assignment" USING btree ("role_id","membership_id");--> statement-breakpoint
CREATE INDEX "access_role_assignment_member_idx" ON "access_role_assignment" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "access_role_company_name_unique" ON "access_role" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "access_role_company_idx" ON "access_role" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_settings_company_unique" ON "ai_settings" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_settings_company_unique" ON "notification_settings" USING btree ("company_id");