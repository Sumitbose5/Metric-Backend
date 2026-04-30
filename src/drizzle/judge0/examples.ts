import {
  pgTable,
  uuid,
  integer,
  text,
  jsonb,
} from "drizzle-orm/pg-core";
import { problems } from "./problems";

/** EXAMPLES TABLE */
export const examples = pgTable("examples", {
  id: uuid("id").defaultRandom().primaryKey(),

  problemId: uuid("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),

  exampleNum: integer("example_num").notNull(),

  exampleText: text("example_text").notNull(),

  images: jsonb("images").$type<string[]>(),
});
