import { pgTable, uuid, jsonb, timestamp } from "drizzle-orm/pg-core";

export const problemTypeSchemas = pgTable("problem_type_schemas", {
  id: uuid("id").defaultRandom().primaryKey(),
  problemId: uuid("problem_id").notNull().unique(),
  
  // Define input parameter types
  inputSchema: jsonb("input_schema").notNull(),
  // Example: [{ "name": "nums", "type": "int[]" }]
  
  // Define output type
  outputSchema: jsonb("output_schema").notNull(),
  // Example: { "type": "int[]", "comparison": "exact" }
  
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(), 
});