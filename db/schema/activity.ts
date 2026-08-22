import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies, companyMemberships } from "./companies";

export const activitySettings = pgTable(
  "activity_settings",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    greenMinimum: integer("green_minimum").notNull().default(1000),
    yellowMinimum: integer("yellow_minimum").notNull().default(400),
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
    uniqueIndex("activity_settings_company_unique").on(table.companyId),
  ],
);
