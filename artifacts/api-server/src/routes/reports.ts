import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reportsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  ListReportsQueryParams, GenerateReportBody, GetReportParams, DownloadReportParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { logAudit } from "../services/auditService";

const router: IRouter = Router();

router.get("/reports", requireAuth, async (req, res): Promise<void> => {
  const params = ListReportsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { type, departmentId } = params.data;

  const reports = await db
    .select({
      id: reportsTable.id,
      type: reportsTable.type,
      title: reportsTable.title,
      status: reportsTable.status,
      departmentId: reportsTable.departmentId,
      subjectId: reportsTable.subjectId,
      academicYear: reportsTable.academicYear,
      fileUrl: reportsTable.fileUrl,
      createdBy: usersTable.name,
      createdAt: reportsTable.createdAt,
    })
    .from(reportsTable)
    .leftJoin(usersTable, eq(reportsTable.createdById, usersTable.id))
    .where(
      and(
        type ? eq(reportsTable.type, type as typeof reportsTable.type.enumValues[number]) : undefined,
        departmentId ? eq(reportsTable.departmentId, departmentId) : undefined,
      )
    )
    .orderBy(desc(reportsTable.createdAt));

  res.json(reports);
});

router.post("/reports/generate", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [report] = await db
    .insert(reportsTable)
    .values({
      type: parsed.data.type as typeof reportsTable.type.enumValues[number],
      title: parsed.data.title,
      status: "pending",
      departmentId: parsed.data.departmentId ?? null,
      subjectId: parsed.data.subjectId ?? null,
      academicYear: parsed.data.academicYear ?? null,
      format: parsed.data.format ?? "pdf",
      createdById: req.user!.userId,
    })
    .returning();

  await logAudit({ userId: req.user!.userId, action: "GENERATE_REPORT", entity: "Report", entityId: report.id });

  setTimeout(async () => {
    await db
      .update(reportsTable)
      .set({ status: "completed", fileUrl: `/api/reports/${report.id}/download` })
      .where(eq(reportsTable.id, report.id));
  }, 3000);

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.user!.userId));

  res.status(202).json({
    id: report.id, type: report.type, title: report.title, status: report.status,
    departmentId: report.departmentId, subjectId: report.subjectId, academicYear: report.academicYear,
    fileUrl: report.fileUrl, createdBy: user?.name ?? "Unknown", createdAt: report.createdAt,
  });
});

router.get("/reports/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [report] = await db
    .select({
      id: reportsTable.id, type: reportsTable.type, title: reportsTable.title,
      status: reportsTable.status, departmentId: reportsTable.departmentId,
      subjectId: reportsTable.subjectId, academicYear: reportsTable.academicYear,
      fileUrl: reportsTable.fileUrl, createdBy: usersTable.name, createdAt: reportsTable.createdAt,
    })
    .from(reportsTable)
    .leftJoin(usersTable, eq(reportsTable.createdById, usersTable.id))
    .where(eq(reportsTable.id, params.data.id));

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  res.json(report);
});

router.get("/reports/:id/download", requireAuth, async (req, res): Promise<void> => {
  const params = DownloadReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [report] = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.id, params.data.id));

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="${report.title}.txt"`);
  res.send(`OBE Attainment Report\n\nTitle: ${report.title}\nType: ${report.type}\nGenerated: ${new Date().toISOString()}\n\nThis report would contain detailed attainment data.`);
});

export default router;
