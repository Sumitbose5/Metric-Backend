import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { problems } from "./problems";

export const codeSnippets = pgTable(
  "code_snippets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 50 }).notNull(),
    starterCode: text("starter_code").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    problemLangIdx: index("idx_code_snippets_problem_lang").on(
      table.problemId,
      table.language
    ),
  })
);
