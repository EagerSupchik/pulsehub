CREATE TYPE "public"."crm_integration_status" AS ENUM('active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('new', 'progress', 'done', 'cancelled');--> statement-breakpoint
CREATE TABLE "crm_integration" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"base_url" text,
	"status" "crm_integration_status" DEFAULT 'active' NOT NULL,
	"sync_secret_hash" text NOT NULL,
	"default_points" integer DEFAULT 100 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_user_mapping" (
	"id" text PRIMARY KEY NOT NULL,
	"integration_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"external_user_id" text NOT NULL,
	"external_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"task_id" text NOT NULL,
	"amount" integer NOT NULL,
	"kind" text DEFAULT 'task_completed' NOT NULL,
	"idempotency_key" text NOT NULL,
	"is_reversal" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"from_status" "task_status",
	"to_status" "task_status" NOT NULL,
	"source_status" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"integration_id" text NOT NULL,
	"external_id" text NOT NULL,
	"assigned_membership_id" text,
	"external_assignee_id" text,
	"title" text NOT NULL,
	"description" text,
	"project" text,
	"source_url" text,
	"source_status" text NOT NULL,
	"status" "task_status" NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"points" integer NOT NULL,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"points_awarded_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone NOT NULL,
	"source_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_integration" ADD CONSTRAINT "crm_integration_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_user_mapping" ADD CONSTRAINT "crm_user_mapping_integration_id_crm_integration_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."crm_integration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_user_mapping" ADD CONSTRAINT "crm_user_mapping_membership_id_company_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."company_membership"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_membership_id_company_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."company_membership"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_status_history" ADD CONSTRAINT "task_status_history_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_integration_id_crm_integration_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."crm_integration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assigned_membership_id_company_membership_id_fk" FOREIGN KEY ("assigned_membership_id") REFERENCES "public"."company_membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_integration_company_idx" ON "crm_integration" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_integration_company_name_unique" ON "crm_integration" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_mapping_external_unique" ON "crm_user_mapping" USING btree ("integration_id","external_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_mapping_membership_unique" ON "crm_user_mapping" USING btree ("integration_id","membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "point_ledger_idempotency_unique" ON "point_ledger" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "point_ledger_membership_created_idx" ON "point_ledger" USING btree ("membership_id","created_at");--> statement-breakpoint
CREATE INDEX "task_history_task_observed_idx" ON "task_status_history" USING btree ("task_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_integration_external_unique" ON "task" USING btree ("integration_id","external_id");--> statement-breakpoint
CREATE INDEX "task_company_assignee_status_idx" ON "task" USING btree ("company_id","assigned_membership_id","status");