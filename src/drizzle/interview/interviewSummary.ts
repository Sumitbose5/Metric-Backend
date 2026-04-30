import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { interviews } from "./interviews";
import { varchar } from "drizzle-orm/pg-core";

export const interviewSummaries = pgTable("interview_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),

  interviewId: uuid("interview_id")
    .references(() => interviews.id, { onDelete: "cascade" })
    .notNull(),

  job_role: varchar("job_role", { length: 50 }).notNull().default("DSA Interview"),

  totalScore: integer("total_score").notNull(),

  communicationScore: integer("communication_score"),
  technicalScore: integer("technical_score"),
  dsaScore: integer("dsa_score"),

  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  aiFeedback: text("ai_feedback"),
  recommendation: text("recommendation"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});