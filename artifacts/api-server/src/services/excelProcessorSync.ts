/**
 * Synchronous Excel processor — fallback when Redis/BullMQ is unavailable.
 * Identical logic to the worker, runs inline.
 */
import * as XLSX from "xlsx";
import { db } from "@workspace/db";
import { studentMarksTable, studentsTable, courseOutcomesTable, uploadJobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

interface ExcelJobData {
  jobId: string;
  subjectId: number;
  examType: string;
  filePath: string;
  uploadedById: number;
}

export default async function processExcelSync(data: ExcelJobData): Promise<void> {
  const { jobId, subjectId, examType, filePath } = data;

  await db.update(uploadJobsTable).set({ status: "processing" }).where(eq(uploadJobsTable.jobId, jobId));

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    const allStudents = await db.select().from(studentsTable);
    const studentMap: Record<string, number> = {};
    for (const s of allStudents) studentMap[s.rollNumber] = s.id;

    const cos = await db.select().from(courseOutcomesTable).where(eq(courseOutcomesTable.subjectId, subjectId));
    const coMap: Record<string, number> = {};
    for (const co of cos) coMap[co.code] = co.id;

    const batchInsert = [];
    const rowErrors: string[] = [];
    let failedRows = 0;

    for (let idx = 0; idx < raw.length; idx++) {
      const row = raw[idx];
      const rowNum = idx + 2;
      const rollNumber = String(row["Roll Number"] || row["roll_number"] || row["rollNumber"] || "").trim();
      const coCode = String(row["CO Code"] || row["co_code"] || row["coCode"] || "").trim();
      const marksObtained = parseFloat(String(row["Marks Obtained"] || row["marks_obtained"] || "0"));
      const maxMarks = parseFloat(String(row["Max Marks"] || row["max_marks"] || "0"));

      if (!rollNumber || !coCode || isNaN(marksObtained) || isNaN(maxMarks) || maxMarks <= 0) {
        rowErrors.push(`Row ${rowNum}: Invalid data`);
        failedRows++;
        continue;
      }

      const studentId = studentMap[rollNumber];
      const coId = coMap[coCode];
      if (!studentId) { rowErrors.push(`Row ${rowNum}: Student '${rollNumber}' not found`); failedRows++; continue; }
      if (!coId) { rowErrors.push(`Row ${rowNum}: CO '${coCode}' not found`); failedRows++; continue; }

      batchInsert.push({
        studentId, subjectId, coId,
        examType: examType as "CIA1" | "CIA2" | "CIA3" | "ESE" | "ASSIGNMENT" | "LAB",
        marksObtained, maxMarks,
      });
    }

    if (batchInsert.length > 0) {
      for (let i = 0; i < batchInsert.length; i += 100) {
        await db.insert(studentMarksTable).values(batchInsert.slice(i, i + 100)).onConflictDoNothing();
      }
    }

    await db.update(uploadJobsTable).set({
      status: "completed",
      totalRows: raw.length,
      processedRows: batchInsert.length,
      failedRows,
      errors: rowErrors.length > 0 ? rowErrors.slice(0, 50).join("\n") : null,
      completedAt: new Date(),
    }).where(eq(uploadJobsTable.jobId, jobId));

  } catch (err) {
    logger.error({ err, jobId }, "Sync Excel processing failed");
    await db.update(uploadJobsTable).set({
      status: "failed",
      errors: err instanceof Error ? err.message : "Unknown error",
      completedAt: new Date(),
    }).where(eq(uploadJobsTable.jobId, jobId));
  }
}
