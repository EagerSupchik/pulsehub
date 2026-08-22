import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const companyRole = pgEnum("company_role", [
  "employee",
  "manager",
  "hr",
  "admin",
]);
export const membershipStatus = pgEnum("membership_status", [
  "active",
  "suspended",
]);

export const companies = pgTable(
  "company",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoUrl: text("logo_url"),
    accentColor: text("accent_color").notNull().default("#7c3aed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("company_slug_unique").on(table.slug)],
);

export const departments = pgTable(
  "department",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("department_company_name_unique").on(
      table.companyId,
      table.name,
    ),
    index("department_company_idx").on(table.companyId),
  ],
);

export const companyMemberships = pgTable(
  "company_membership",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: companyRole("role").notNull().default("employee"),
    status: membershipStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("membership_company_user_unique").on(
      table.companyId,
      table.userId,
    ),
    index("membership_user_idx").on(table.userId),
    index("membership_company_role_idx").on(table.companyId, table.role),
  ],
);

export type CompanyRole = (typeof companyRole.enumValues)[number];
