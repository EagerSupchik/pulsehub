import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies, companyMemberships } from "./companies";

export const crmIntegrationStatus = pgEnum("crm_integration_status", [
  "active",
  "paused",
]);
export const taskStatus = pgEnum("task_status", [
  "new",
  "progress",
  "done",
  "cancelled",
]);
export const taskPriority = pgEnum("task_priority", ["low", "medium", "high"]);

export const crmIntegrations = pgTable(
  "crm_integration",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    name: text("name").notNull(),
    baseUrl: text("base_url"),
    status: crmIntegrationStatus("status").notNull().default("active"),
    syncSecretHash: text("sync_secret_hash").notNull(),
    defaultPoints: integer("default_points").notNull().default(100),
    config: jsonb("config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("crm_integration_company_idx").on(table.companyId),
    uniqueIndex("crm_integration_company_name_unique").on(
      table.companyId,
      table.name,
    ),
  ],
);

export const crmUserMappings = pgTable(
  "crm_user_mapping",
  {
    id: text("id").primaryKey(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => crmIntegrations.id, { onDelete: "cascade" }),
    membershipId: text("membership_id")
      .notNull()
      .references(() => companyMemberships.id, { onDelete: "cascade" }),
    externalUserId: text("external_user_id").notNull(),
    externalEmail: text("external_email"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("crm_mapping_external_unique").on(
      table.integrationId,
      table.externalUserId,
    ),
    uniqueIndex("crm_mapping_membership_unique").on(
      table.integrationId,
      table.membershipId,
    ),
  ],
);

export const tasks = pgTable(
  "task",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    integrationId: text("integration_id")
      .notNull()
      .references(() => crmIntegrations.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    assignedMembershipId: text("assigned_membership_id").references(
      () => companyMemberships.id,
      { onDelete: "set null" },
    ),
    externalAssigneeId: text("external_assignee_id"),
    title: text("title").notNull(),
    description: text("description"),
    project: text("project"),
    sourceUrl: text("source_url"),
    sourceStatus: text("source_status").notNull(),
    status: taskStatus("status").notNull(),
    priority: taskPriority("priority").notNull().default("medium"),
    workStyle: text("work_style"),
    basePoints: integer("base_points").notNull().default(0),
    personalityBonus: integer("personality_bonus").notNull().default(0),
    points: integer("points").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    pointsAwardedAt: timestamp("points_awarded_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
    sourcePayload: jsonb("source_payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("task_integration_external_unique").on(
      table.integrationId,
      table.externalId,
    ),
    index("task_company_assignee_status_idx").on(
      table.companyId,
      table.assignedMembershipId,
      table.status,
    ),
  ],
);

export const taskStatusHistory = pgTable(
  "task_status_history",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    fromStatus: taskStatus("from_status"),
    toStatus: taskStatus("to_status").notNull(),
    sourceStatus: text("source_status").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("task_history_task_observed_idx").on(table.taskId, table.observedAt),
  ],
);

export const pointLedger = pgTable(
  "point_ledger",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    membershipId: text("membership_id")
      .notNull()
      .references(() => companyMemberships.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    kind: text("kind").notNull().default("task_completed"),
    idempotencyKey: text("idempotency_key").notNull(),
    isReversal: boolean("is_reversal").notNull().default(false),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("point_ledger_idempotency_unique").on(table.idempotencyKey),
    index("point_ledger_membership_created_idx").on(
      table.membershipId,
      table.createdAt,
    ),
  ],
);
