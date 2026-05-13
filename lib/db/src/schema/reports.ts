import { pgTable, serial, timestamp, integer, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportTypeEnum = pgEnum("report_type", [
  "CO_ATTAINMENT", "PO_ATTAINMENT", "PSO_ATTAINMENT", "NBA", "NAAC", "STUDENT_PERFORMANCE"
]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "generating", "completed", "failed"]);

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  type: reportTypeEnum("type").notNull(),
  title: text("title").notNull(),
  status: reportStatusEnum("status").notNull().default("pending"),
  departmentId: integer("department_id"),
  subjectId: integer("subject_id"),
  academicYear: text("academic_year"),
  format: text("format").notNull().default("pdf"),
  fileUrl: text("file_url"),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
