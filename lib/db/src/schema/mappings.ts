import { pgTable, serial, timestamp, integer, boolean, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const targetTypeEnum = pgEnum("mapping_target_type", ["PO", "PSO"]);

export const coPOMappingsTable = pgTable("co_po_mappings", {
  id: serial("id").primaryKey(),
  coId: integer("co_id").notNull(),
  targetType: targetTypeEnum("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  correlationLevel: integer("correlation_level").notNull().default(0),
  isApproved: boolean("is_approved").notNull().default(false),
  approvedById: integer("approved_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMappingSchema = createInsertSchema(coPOMappingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMapping = z.infer<typeof insertMappingSchema>;
export type Mapping = typeof coPOMappingsTable.$inferSelect;
