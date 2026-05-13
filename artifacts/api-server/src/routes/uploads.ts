import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { uploadJobsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { GetUploadStatusParams, ListUploadHistoryQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.includes("spreadsheet") || file.originalname.endsWith(".xlsx") || file.originalname.endsWith(".xls")) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed"));
    }
  },
});

router.post("/uploads/marks", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  const subjectId = parseInt(req.body?.subjectId || "0", 10);
  const examType = req.body?.examType;

  if (!subjectId || !examType) {
    res.status(400).json({ error: "subjectId and examType are required" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Excel file is required" });
    return;
  }

  const jobId = randomUUID();

  const [job] = await db
    .insert(uploadJobsTable)
    .values({
      jobId,
      status: "queued",
      subjectId,
      examType,
      createdById: req.user!.userId,
    })
    .returning();

  try {
    const { Queue } = await import("bullmq");
    const { getRedisConnection } = await import("../workers/redisConnection");
    const queue = new Queue("excel-processing", { connection: getRedisConnection() });
    await queue.add("process-excel", {
      jobId,
      subjectId,
      examType,
      filePath: req.file.path,
      uploadedById: req.user!.userId,
    });
    logger.info({ jobId }, "Excel job queued via BullMQ");
  } catch (err) {
    logger.warn({ err }, "Redis unavailable — processing Excel synchronously");
    const { default: processExcelSync } = await import("../services/excelProcessorSync");
    await processExcelSync({ jobId, subjectId, examType, filePath: req.file.path, uploadedById: req.user!.userId });
  }

  res.status(202).json({
    jobId: job.jobId,
    status: job.status,
    subjectId: job.subjectId,
    examType: job.examType,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    failedRows: job.failedRows,
    errors: job.errors,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  });
});

router.get("/uploads/:jobId/status", requireAuth, async (req, res): Promise<void> => {
  const params = GetUploadStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db
    .select()
    .from(uploadJobsTable)
    .where(eq(uploadJobsTable.jobId, params.data.jobId));

  if (!job) {
    res.status(404).json({ error: "Upload job not found" });
    return;
  }

  res.json({
    jobId: job.jobId, status: job.status, subjectId: job.subjectId, examType: job.examType,
    totalRows: job.totalRows, processedRows: job.processedRows, failedRows: job.failedRows,
    errors: job.errors, createdAt: job.createdAt, completedAt: job.completedAt,
  });
});

router.get("/uploads/history", requireAuth, async (req, res): Promise<void> => {
  const params = ListUploadHistoryQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { subjectId, limit = 20 } = params.data;

  const jobs = await db
    .select()
    .from(uploadJobsTable)
    .where(subjectId ? eq(uploadJobsTable.subjectId, subjectId) : undefined)
    .orderBy(desc(uploadJobsTable.createdAt))
    .limit(limit);

  res.json(jobs.map((j) => ({
    jobId: j.jobId, status: j.status, subjectId: j.subjectId, examType: j.examType,
    totalRows: j.totalRows, processedRows: j.processedRows, failedRows: j.failedRows,
    errors: j.errors, createdAt: j.createdAt, completedAt: j.completedAt,
  })));
});

export default router;
