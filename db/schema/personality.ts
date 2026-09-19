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
import { companyMemberships } from "./companies";

export type PersonalityAnswers = Record<string, number>;

export const personalityProfiles = pgTable(
  "personality_profile",
  {
    id: text("id").primaryKey(),
    membershipId: text("membership_id")
      .notNull()
      .references(() => companyMemberships.id, { onDelete: "cascade" }),
    assessmentVersion: integer("assessment_version").notNull().default(1),
    answers: jsonb("answers")
      .$type<PersonalityAnswers>()
      .notNull()
      .default({}),
    openness: integer("openness").notNull(),
    conscientiousness: integer("conscientiousness").notNull(),
    extraversion: integer("extraversion").notNull(),
    agreeableness: integer("agreeableness").notNull(),
    emotionalStability: integer("emotional_stability").notNull(),
    primaryStyle: text("primary_style").notNull(),
    shareWithManagers: boolean("share_with_managers").notNull().default(false),
    consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("personality_profile_membership_unique").on(table.membershipId),
    index("personality_profile_style_idx").on(table.primaryStyle),
  ],
);
