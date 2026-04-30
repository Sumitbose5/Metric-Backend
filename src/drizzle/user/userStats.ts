import {
  pgTable,
  uuid,
  integer,
  bigint,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export const userStats = pgTable("user_stats", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique()
    .notNull(),

  trialsRemaining: integer("trials_remaining").default(2),

  interviewsTaken: integer("interviews_taken").default(0),
  dsaInterviewsTaken: integer("dsa_interviews_taken").default(0),
  resumeInterviewsTaken: integer("resume_interviews_taken").default(0),

  aiTokensUsed: bigint("ai_tokens_used", { mode: "number" }).default(0),

  lastInterviewAt: timestamp("last_interview_at"),
});