import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb
} from "drizzle-orm/pg-core";

export const testCases = pgTable("test_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
 
  problemId: uuid("problem_id").notNull(),

  input: jsonb("input").notNull(),
  expectedOutput: text("expected_output").notNull(),

  isHidden: boolean("is_hidden").default(true).notNull(),

  order: integer("order").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
