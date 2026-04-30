import {
  pgTable,
  uuid,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { interviews } from "./interviews";

export const interviewProblems = pgTable("interview_problems", {
  id: uuid("id").defaultRandom().primaryKey(),

  interviewId: uuid("interview_id")
    .notNull()
    .references(() => interviews.id, { onDelete: "cascade" }),

  problemId: uuid("problem_id").notNull(),

  order: integer("order").notNull(),

  isSolved: boolean("is_solved").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
