import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companyMemberships, departments } from "./companies";

export const employeeProfiles = pgTable(
  "employee_profile",
  {
    id: text("id").primaryKey(),
    membershipId: text("membership_id")
      .notNull()
      .references(() => companyMemberships.id, { onDelete: "cascade" }),
    departmentId: text("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    jobTitle: text("job_title"),
    activityPoints: integer("activity_points").notNull().default(0),
    walletPoints: integer("wallet_points").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("employee_membership_unique").on(table.membershipId)],
);
