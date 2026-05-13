import { pgTable, serial, timestamp, integer, doublePrecision, boolean, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const surveyTypeEnum = pgEnum("survey_type", ["EXIT_SURVEY", "COURSE_FEEDBACK", "ALUMNI_SURVEY"]);

export const directAttainmentTable = pgTable("direct_attainment", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull(),
  coId: integer("co_id").notNull(),
  attainmentValue: doublePrecision("attainment_value").notNull(),
  studentCount: integer("student_count").notNull().default(0),
  attainedCount: integer("attained_count").notNull().default(0),
  academicYear: text("academic_year"),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const indirectAttainmentTable = pgTable("indirect_attainment", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull(),
  coId: integer("co_id").notNull(),
  surveyType: surveyTypeEnum("survey_type").notNull(),
  attainmentValue: doublePrecision("attainment_value").notNull(),
  responseCount: integer("response_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const finalAttainmentTable = pgTable("final_attainment", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull(),
  coId: integer("co_id").notNull(),
  directAttainment: doublePrecision("direct_attainment").notNull(),
  indirectAttainment: doublePrecision("indirect_attainment").notNull(),
  directWeightage: doublePrecision("direct_weightage").notNull().default(0.8),
  indirectWeightage: doublePrecision("indirect_weightage").notNull().default(0.2),
  finalAttainment: doublePrecision("final_attainment").notNull(),
  threshold: doublePrecision("threshold").notNull().default(60),
  isAttained: boolean("is_attained").notNull().default(false),
  academicYear: text("academic_year"),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDirectAttainmentSchema = createInsertSchema(directAttainmentTable).omit({ id: true, calculatedAt: true });
export const insertIndirectAttainmentSchema = createInsertSchema(indirectAttainmentTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFinalAttainmentSchema = createInsertSchema(finalAttainmentTable).omit({ id: true, calculatedAt: true });

export type DirectAttainment = typeof directAttainmentTable.$inferSelect;
export type IndirectAttainment = typeof indirectAttainmentTable.$inferSelect;
export type FinalAttainment = typeof finalAttainmentTable.$inferSelect;
