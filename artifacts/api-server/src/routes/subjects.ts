import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { subjectsTable, departmentsTable, usersTable, regulationsTable, courseOutcomesTable, finalAttainmentTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateSubjectBody, UpdateSubjectBody, GetSubjectParams, UpdateSubjectParams,
  ListSubjectsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { logAudit } from "../services/auditService";

const router: IRouter = Router();

router.get("/subjects", requireAuth, async (req, res): Promise<void> => {
  const params = ListSubjectsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { departmentId, regulationId, semester, academicYear } = params.data;

  const subjects = await db
    .select({
      id: subjectsTable.id,
      name: subjectsTable.name,
      code: subjectsTable.code,
      semester: subjectsTable.semester,
      academicYear: subjectsTable.academicYear,
      credits: subjectsTable.credits,
      departmentId: subjectsTable.departmentId,
      departmentName: departmentsTable.name,
      regulationId: subjectsTable.regulationId,
      facultyId: subjectsTable.facultyId,
      facultyName: usersTable.name,
      createdAt: subjectsTable.createdAt,
    })
    .from(subjectsTable)
    .leftJoin(departmentsTable, eq(subjectsTable.departmentId, departmentsTable.id))
    .leftJoin(usersTable, eq(subjectsTable.facultyId, usersTable.id))
    .where(
      and(
        departmentId ? eq(subjectsTable.departmentId, departmentId) : undefined,
        regulationId ? eq(subjectsTable.regulationId, regulationId) : undefined,
        semester ? eq(subjectsTable.semester, semester) : undefined,
        academicYear ? eq(subjectsTable.academicYear, academicYear) : undefined,
      )
    )
    .orderBy(subjectsTable.semester, subjectsTable.name);

  const withCounts = await Promise.all(
    subjects.map(async (s) => {
      const [coResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(courseOutcomesTable)
        .where(eq(courseOutcomesTable.subjectId, s.id));
      const attainRows = await db
        .select({ finalAttainment: finalAttainmentTable.finalAttainment, threshold: finalAttainmentTable.threshold, isAttained: finalAttainmentTable.isAttained })
        .from(finalAttainmentTable)
        .where(eq(finalAttainmentTable.subjectId, s.id));
      let attainmentStatus: string | null = null;
      if (attainRows.length > 0) {
        const attained = attainRows.filter((r) => r.isAttained).length;
        attainmentStatus = attained === attainRows.length ? "FULL" : attained === 0 ? "NONE" : "PARTIAL";
      }
      return { ...s, coCount: coResult.count, attainmentStatus };
    })
  );

  res.json(withCounts);
});

router.post("/subjects", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [subject] = await db.insert(subjectsTable).values(parsed.data).returning();
  await logAudit({ userId: req.user!.userId, action: "CREATE_SUBJECT", entity: "Subject", entityId: subject.id });

  res.status(201).json({ ...subject, departmentName: null, facultyName: null, coCount: 0, attainmentStatus: null });
});

router.get("/subjects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [subject] = await db
    .select({
      id: subjectsTable.id, name: subjectsTable.name, code: subjectsTable.code,
      semester: subjectsTable.semester, academicYear: subjectsTable.academicYear,
      credits: subjectsTable.credits, departmentId: subjectsTable.departmentId,
      departmentName: departmentsTable.name, regulationId: subjectsTable.regulationId,
      facultyId: subjectsTable.facultyId, facultyName: usersTable.name,
      createdAt: subjectsTable.createdAt,
    })
    .from(subjectsTable)
    .leftJoin(departmentsTable, eq(subjectsTable.departmentId, departmentsTable.id))
    .leftJoin(usersTable, eq(subjectsTable.facultyId, usersTable.id))
    .where(eq(subjectsTable.id, params.data.id));

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const [coResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(courseOutcomesTable)
    .where(eq(courseOutcomesTable.subjectId, subject.id));

  res.json({ ...subject, coCount: coResult.count, attainmentStatus: null });
});

router.patch("/subjects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [subject] = await db
    .update(subjectsTable)
    .set(parsed.data)
    .where(eq(subjectsTable.id, params.data.id))
    .returning();

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  await logAudit({ userId: req.user!.userId, action: "UPDATE_SUBJECT", entity: "Subject", entityId: subject.id });
  res.json({ ...subject, departmentName: null, facultyName: null, coCount: null, attainmentStatus: null });
});

export default router;
