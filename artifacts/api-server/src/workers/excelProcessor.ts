/**
 * BullMQ Worker — Excel Marks Processing Pipeline
 *
 * Job data: { jobId, subjectId, examType, filePath, uploadedById }
 * Steps:
 *  1. Read .xlsx file with SheetJS
 *  2. Validate row structure (rollNumber, coCode, marksObtained, maxMarks)
 *  3. Resolve student IDs and CO IDs from DB
 *  4. Bulk-insert valid rows into student_marks
 *  5. Update upload_jobs with result stats
 */

import { Worker, Job } from "bullmq";
import * as XLSX from "xlsx";
import { db } from "@workspace/db";
import {
  studentMarksTable,
  studentsTable,
  courseOutcomesTable,
  uploadJobsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getRedisConnection } from "./redisConnection";

export interface ExcelJobData {
  jobId: string;
  subjectId: number;
  examType: string;
  filePath: string;
  uploadedById: number;
}

interface ExcelRow {
  rollNumber: string;
  coCode: string;
  marksObtained: number;
  maxMarks: number;
}

function parseExcelFile(filePath: string): { rows: ExcelRow[]; errors: string[] } {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    const rows: ExcelRow[] = [];
    const errors: string[] = [];

    raw.forEach((row, idx) => {
      const rowNum = idx + 2;
      const rollNumber = String(row["Roll Number"] || row["roll_number"] || row["rollNumber"] || "").trim();
      const coCode = String(row["CO Code"] || row["co_code"] || row["coCode"] || "").trim();
      const marksObtained = parseFloat(String(row["Marks Obtained"] || row["marks_obtained"] || row["marksObtained"] || "0"));
      const maxMarks = parseFloat(String(row["Max Marks"] || row["max_marks"] || row["maxMarks"] || "0"));

      if (!rollNumber) { errors.push(`Row ${rowNum}: Missing Roll Number`); return; }
      if (!coCode) { errors.push(`Row ${rowNum}: Missing CO Code`); return; }
      if (isNaN(marksObtained)) { errors.push(`Row ${rowNum}: Invalid marks obtained`); return; }
      if (isNaN(maxMarks) || maxMarks <= 0) { errors.push(`Row ${rowNum}: Invalid max marks`); return; }
      if (marksObtained > maxMarks) { errors.push(`Row ${rowNum}: Marks obtained exceeds max marks`); return; }

      rows.push({ rollNumber, coCode, marksObtained, maxMarks });
    });

    return { rows, errors };
  } catch (err) {
    logger.error({ err }, "Error parsing Excel file");
    return { rows: [], errors: ["Failed to parse Excel file"] };
  }
}

export function createExcelWorker(): Worker {
  const connection = getRedisConnection();

  const worker = new Worker<ExcelJobData>(
    "excel-processing",
    async (job: Job<ExcelJobData>) => {
      const { jobId, subjectId, examType, filePath } = job.data;
      logger.info({ jobId, subjectId }, "Starting Excel processing job");

      await db
        .update(uploadJobsTable)
        .set({ status: "processing" })
        .where(eq(uploadJobsTable.jobId, jobId));

      const { rows, errors } = parseExcelFile(filePath);

      await db
        .update(uploadJobsTable)
        .set({ totalRows: rows.length })
        .where(eq(uploadJobsTable.jobId, jobId));

      let processedRows = 0;
      let failedRows = 0;
      const rowErrors: string[] = [...errors];

      const students = await db
        .select()
        .from(studentsTable)
        .where(eq(studentsTable.departmentId, subjectId));

      const studentMap: Record<string, number> = {};
      const allStudents = await db.select().from(studentsTable);
      for (const s of allStudents) {
        studentMap[s.rollNumber] = s.id;
      }

      const cos = await db
        .select()
        .from(courseOutcomesTable)
        .where(eq(courseOutcomesTable.subjectId, subjectId));
      const coMap: Record<string, number> = {};
      for (const co of cos) {
        coMap[co.code] = co.id;
      }

      const batchInsert = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const studentId = studentMap[row.rollNumber];
        const coId = coMap[row.coCode];

        if (!studentId) {
          rowErrors.push(`Row ${i + 2}: Student with roll number '${row.rollNumber}' not found`);
          failedRows++;
          continue;
        }
        if (!coId) {
          rowErrors.push(`Row ${i + 2}: CO '${row.coCode}' not found for this subject`);
          failedRows++;
          continue;
        }

        batchInsert.push({
          studentId,
          subjectId,
          coId,
          examType: examType as "CIA1" | "CIA2" | "CIA3" | "ESE" | "ASSIGNMENT" | "LAB",
          marksObtained: row.marksObtained,
          maxMarks: row.maxMarks,
        });
        processedRows++;
      }

      if (batchInsert.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < batchInsert.length; i += chunkSize) {
          const chunk = batchInsert.slice(i, i + chunkSize);
          await db.insert(studentMarksTable).values(chunk).onConflictDoNothing();
        }
      }

      const finalStatus = failedRows === 0 && rowErrors.length === errors.length ? "completed" : "completed";

      await db
        .update(uploadJobsTable)
        .set({
          status: finalStatus,
          processedRows,
          failedRows,
          errors: rowErrors.length > 0 ? rowErrors.slice(0, 50).join("\n") : null,
          completedAt: new Date(),
        })
        .where(eq(uploadJobsTable.jobId, jobId));

      logger.info({ jobId, processedRows, failedRows }, "Excel processing job completed");
      return { processedRows, failedRows };
    },
    { connection }
  );

  worker.on("failed", async (job, err) => {
    if (job) {
      logger.error({ jobId: job.data.jobId, err }, "Excel processing job failed");
      await db
        .update(uploadJobsTable)
        .set({ status: "failed", errors: err.message, completedAt: new Date() })
        .where(eq(uploadJobsTable.jobId, job.data.jobId));
    }
  });

  return worker;
}
