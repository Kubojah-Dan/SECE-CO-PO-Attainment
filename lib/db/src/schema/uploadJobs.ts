import { pgTable, serial, timestamp, integer, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const uploadStatusEnum = pgEnum("upload_status", ["queued", "processing", "completed", "failed"]);

export const uploadJobsTable = pgTable("upload_jobs", {
  id: serial("id").primaryKey(),
  jobId: text("job_id").notNull().unique(),
  status: uploadStatusEnum("status").notNull().default("queued"),
  subjectId: integer("subject_id").notNull(),
  examType: text("exam_type").notNull(),
  totalRows: integer("total_rows"),
  processedRows: integer("processed_rows"),
  failedRows: integer("failed_rows"),
  errors: text("errors"),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertUploadJobSchema = createInsertSchema(uploadJobsTable).omit({ id: true, createdAt: true });
export type InsertUploadJob = z.infer<typeof insertUploadJobSchema>;
export type UploadJob = typeof uploadJobsTable.$inferSelect;
