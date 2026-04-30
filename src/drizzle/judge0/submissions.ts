import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { interviews } from "../interview/interviews";

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),

  interviewId: uuid("interview_id")
    .notNull()
    .references(() => interviews.id, { onDelete: "cascade" }),

  problemId: uuid("problem_id").notNull(),
  userId: uuid("user_id").notNull(),

  sourceCode: text("source_code").notNull(),
  languageId: integer("language_id").notNull(),

  // use string union typing for submission verdict
  verdict: text("verdict").$type<
    | "ACCEPTED"
    | "WRONG_ANSWER"
    | "TIME_LIMIT_EXCEEDED"
    | "RUNTIME_ERROR"
    | "COMPILATION_ERROR"
    | "ABORTED"
  >().notNull(),

  passedTestCases: integer("passed_test_cases").notNull(),
  totalTestCases: integer("total_test_cases").notNull(),

  executionTimeMs: integer("execution_time_ms"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
