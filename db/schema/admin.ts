import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies, companyMemberships } from "./companies";

export const accessRoles = pgTable(
  "access_role",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
    createdByMembershipId: text("created_by_membership_id").references(
      () => companyMemberships.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("access_role_company_name_unique").on(
      table.companyId,
      table.name,
    ),
    index("access_role_company_idx").on(table.companyId),
  ],
);

export const accessRoleAssignments = pgTable(
  "access_role_assignment",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id")
      .notNull()
      .references(() => accessRoles.id, { onDelete: "cascade" }),
    membershipId: text("membership_id")
      .notNull()
      .references(() => companyMemberships.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("access_role_assignment_unique").on(
      table.roleId,
      table.membershipId,
    ),
    index("access_role_assignment_member_idx").on(table.membershipId),
  ],
);

export const notificationSettings = pgTable(
  "notification_settings",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").notNull().default(false),
    fromName: text("from_name").notNull().default("PulseHub"),
    replyTo: text("reply_to"),
    taskAssigned: boolean("task_assigned").notNull().default(true),
    taskDueSoon: boolean("task_due_soon").notNull().default(true),
    taskCompleted: boolean("task_completed").notNull().default(false),
    eventRegistration: boolean("event_registration").notNull().default(true),
    weeklyDigest: boolean("weekly_digest").notNull().default(true),
    digestDay: integer("digest_day").notNull().default(1),
    eventRecipients: jsonb("event_recipients")
      .$type<string[]>()
      .notNull()
      .default([]),
    updatedByMembershipId: text("updated_by_membership_id").references(
      () => companyMemberships.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_settings_company_unique").on(table.companyId),
  ],
);

export const aiSettings = pgTable(
  "ai_settings",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(false),
    provider: text("provider").notNull().default("openai"),
    model: text("model").notNull().default("gpt-5-mini"),
    baseUrl: text("base_url"),
    systemPrompt: text("system_prompt"),
    apiKeyEncrypted: text("api_key_encrypted"),
    apiKeyLast4: text("api_key_last4"),
    updatedByMembershipId: text("updated_by_membership_id").references(
      () => companyMemberships.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("ai_settings_company_unique").on(table.companyId)],
);
