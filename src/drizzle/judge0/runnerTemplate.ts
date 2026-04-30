import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { problems } from "./problems";

export const runnerTemplates = pgTable("runner_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  problemId: uuid("problem_id").notNull().references(() => problems.id, { onDelete: "cascade" }),
  
  language: varchar("language", { length: 50 }).notNull(), // e.g., 'cpp', 'python', 'java'
  
  // The "Master Wrapper" code with placeholders like {{user_code}} and {{test_cases}}
  templateCode: text("template_code").notNull(), 
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});