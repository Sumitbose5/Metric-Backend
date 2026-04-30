import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { problems } from "./problems";
import { topics } from "./topics";

/** PROBLEM <-> TOPIC JOIN TABLE */
export const problemTopics = pgTable(
  "problem_topics",
  {
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),

    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.problemId, table.topicId] }),
  })
);
