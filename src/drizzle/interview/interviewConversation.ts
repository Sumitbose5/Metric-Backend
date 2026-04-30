import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";
import { interviews } from "./interviews";

export const interviewMessages = pgTable("interview_messages", {
  id: uuid("id").defaultRandom().primaryKey(),

  interviewId: uuid("interview_id")
    .references(() => interviews.id, { onDelete: "cascade" })
    .notNull(),

  role: varchar("role", { length: 20 })
    .$type<"USER" | "AI" | "SYSTEM">()
    .notNull(),

  content: text("content").notNull(),

  // Optional structured output (scores, hints, metadata)
  metadata: jsonb("metadata"),

  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});