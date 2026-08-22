import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";
import { companies, companyMemberships } from "./companies";

export const eventStatus = pgEnum("event_status", ["published", "cancelled"]);
export const eventRegistrationStatus = pgEnum("event_registration_status", [
  "registered",
  "cancelled",
]);

export const events = pgTable(
  "event",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    kind: text("kind").notNull().default("Компания"),
    location: text("location").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    capacity: integer("capacity").notNull(),
    status: eventStatus("status").notNull().default("published"),
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
    index("event_company_starts_idx").on(table.companyId, table.startsAt),
  ],
);

export const eventRegistrations = pgTable(
  "event_registration",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    membershipId: text("membership_id")
      .notNull()
      .references(() => companyMemberships.id, { onDelete: "cascade" }),
    status: eventRegistrationStatus("status").notNull().default("registered"),
    registeredAt: timestamp("registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("event_registration_event_member_unique").on(
      table.eventId,
      table.membershipId,
    ),
    index("event_registration_member_idx").on(table.membershipId, table.status),
  ],
);
