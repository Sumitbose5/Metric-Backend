import {
  pgTable,
  uuid,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  plan: varchar("plan", { length: 20 })
    .$type<"FREE" | "PRO" | "ENTERPRISE">()
    .default("FREE")
    .notNull(),

  status: varchar("status", { length: 20 })
    .$type<"ACTIVE" | "CANCELED" | "PAST_DUE">()
    .default("ACTIVE")
    .notNull(),

  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),

  currentPeriodEnd: timestamp("current_period_end"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});