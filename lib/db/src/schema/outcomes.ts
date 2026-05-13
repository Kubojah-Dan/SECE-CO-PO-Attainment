import { pgTable, text, serial, timestamp, integer, pgEnum, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bloomsLevelEnum = pgEnum("blooms_level", [
  "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"
]);

export const courseOutcomesTable = pgTable("course_outcomes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  subjectId: integer("subject_id").notNull(),
  bloomsLevel: bloomsLevelEnum("blooms_level").notNull().default("Understand"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const programOutcomesTable = pgTable("program_outcomes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  departmentId: integer("department_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const programSpecificOutcomesTable = pgTable("program_specific_outcomes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  departmentId: integer("department_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCOSchema = createInsertSchema(courseOutcomesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPOSchema = createInsertSchema(programOutcomesTable).omit({ id: true, createdAt: true });
export const insertPSOSchema = createInsertSchema(programSpecificOutcomesTable).omit({ id: true, createdAt: true });

export type InsertCO = z.infer<typeof insertCOSchema>;
export type InsertPO = z.infer<typeof insertPOSchema>;
export type InsertPSO = z.infer<typeof insertPSOSchema>;
export type CourseOutcome = typeof courseOutcomesTable.$inferSelect;
export type ProgramOutcome = typeof programOutcomesTable.$inferSelect;
export type ProgramSpecificOutcome = typeof programSpecificOutcomesTable.$inferSelect;
