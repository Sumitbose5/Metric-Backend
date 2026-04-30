import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "../user/user";
import { varchar } from "drizzle-orm/pg-core";

export const resumes = pgTable("resumes", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  name: varchar("name", { length: 20 }).notNull(),

  resumeUrl: text("resume_url").notNull(),
  parsedData: jsonb("parsed_data"),

  uploadedAt: timestamp("uploaded_at").defaultNow(),
});