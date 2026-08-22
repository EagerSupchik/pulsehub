import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { companies, companyMemberships } from "./companies";

export const bonusStatus = pgEnum("bonus_status", ["active", "archived"]);
export const bonusRedemptionStatus = pgEnum("bonus_redemption_status", [
  "requested",
  "approved",
  "fulfilled",
  "cancelled",
]);

export const bonusItems = pgTable(
  "bonus_item",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    price: integer("price").notNull(),
    emoji: text("emoji").notNull().default("✦"),
    tint: text("tint").notNull().default("blue"),
    stock: integer("stock"),
    status: bonusStatus("status").notNull().default("active"),
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
    index("bonus_item_company_status_idx").on(table.companyId, table.status),
  ],
);

export const bonusRedemptions = pgTable(
  "bonus_redemption",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    bonusId: text("bonus_id")
      .notNull()
      .references(() => bonusItems.id, { onDelete: "restrict" }),
    membershipId: text("membership_id")
      .notNull()
      .references(() => companyMemberships.id, { onDelete: "restrict" }),
    price: integer("price").notNull(),
    status: bonusRedemptionStatus("status").notNull().default("requested"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bonus_redemption_company_created_idx").on(
      table.companyId,
      table.createdAt,
    ),
    index("bonus_redemption_member_created_idx").on(
      table.membershipId,
      table.createdAt,
    ),
  ],
);
