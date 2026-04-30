import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
  boolean
} from "drizzle-orm/pg-core";

export const problems = pgTable(
  "problems",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    metricId: varchar("metric_id", { length: 30 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    // use string union typing for difficulty instead of pgEnum
    difficulty: text("difficulty").$type<"EASY" | "MEDIUM" | "HARD">().notNull(),
    description: text("description").notNull(),
    constraints: jsonb("constraints").$type<string[]>(),
    hints: jsonb("hints").$type<string[]>(),
    followUps: jsonb("follow_ups").$type<string[]>(),
    isAvailable: boolean("is_available").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    difficultyIdx: index("idx_problems_difficulty").on(table.difficulty),
  })
);
