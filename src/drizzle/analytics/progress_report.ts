// src/db/schema/progressReports.ts
import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { users } from "../user/user";

export const progressReports = pgTable("progress_reports", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  strongTopics: jsonb("strong_topics"),
  weakTopics: jsonb("weak_topics"),

  averageScore: integer("average_score"),

  generatedAt: timestamp("generated_at").defaultNow(),
});