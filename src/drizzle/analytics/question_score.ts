import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { interviews } from "../interview/interviews";
import { problems } from "../judge0/problems";

export const questionScores = pgTable("question_scores", {
  id: uuid("id").defaultRandom().primaryKey(),

  interviewId: uuid("interview_id")
    .references(() => interviews.id, { onDelete: "cascade" })
    .notNull(),

  problemId: uuid("question_id")
    .references(() => problems.id, { onDelete: "cascade" })
    .notNull(),

  totalScore: integer("score").notNull(), // e.g., out of 100

  // Breakdown scores
  communicationScore: integer("communication_score"), // 20
  timeComplexityScore: integer("time_complexity_score"), // 10
  spaceComplexityScore: integer("space_complexity_score"), // 10
  solutionCorrectnessScore: integer("solution_correctness_score"),  // 50
  codeQualityScore: integer("code_quality_score"), // 10

  feedback: text("feedback"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});