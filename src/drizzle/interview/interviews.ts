import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

export const interviews = pgTable("interviews", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: varchar("user_id", {length:50}).notNull(),

  // use string unions for enums to avoid pgEnum
  type: text("type").$type<"DSA" | "OA" | "RESUME">().notNull(),
  difficulty: text("difficulty").$type<"beginner" | "intermediate" | "advanced">().notNull(),

  status: text("status")
    .$type<"CREATED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED">()
    .notNull()
    .default("CREATED"),

  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),

  score: integer("score"),
  verdict: varchar("verdict", { length: 20 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
