import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("idx_topics_name").on(table.name),
  })
);
