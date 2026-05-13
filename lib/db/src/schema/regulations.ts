import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const regulationsTable = pgTable("regulations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  departmentId: integer("department_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRegulationSchema = createInsertSchema(regulationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRegulation = z.infer<typeof insertRegulationSchema>;
export type Regulation = typeof regulationsTable.$inferSelect;
