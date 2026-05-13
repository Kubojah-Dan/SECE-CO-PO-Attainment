import { pgTable, serial, timestamp, integer, doublePrecision, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const examTypeEnum = pgEnum("exam_type", ["CIA1", "CIA2", "CIA3", "ESE", "ASSIGNMENT", "LAB"]);

export const studentMarksTable = pgTable("student_marks", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  subjectId: integer("subject_id").notNull(),
  coId: integer("co_id").notNull(),
  examType: examTypeEnum("exam_type").notNull(),
  marksObtained: doublePrecision("marks_obtained").notNull(),
  maxMarks: doublePrecision("max_marks").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarkSchema = createInsertSchema(studentMarksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMark = z.infer<typeof insertMarkSchema>;
export type StudentMark = typeof studentMarksTable.$inferSelect;
