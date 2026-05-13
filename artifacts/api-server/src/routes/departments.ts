import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  departmentsTable, usersTable, subjectsTable, studentsTable,
  courseOutcomesTable, finalAttainmentTable,
} from "@workspace/db";
import { eq, and, count, avg, sql, desc } from "drizzle-orm";
import {
  CreateDepartmentBody, UpdateDepartmentBody,
  GetDepartmentParams, UpdateDepartmentParams, GetDepartmentStatsParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../services/auditService";

const router: IRouter = Router();

router.get("/departments", requireAuth, async (req, res): Promise<void> => {
  const depts = await db
    .select({
      id: departmentsTable.id,
      name: departmentsTable.name,
      code: departmentsTable.code,
      hodName: usersTable.name,
      createdAt: departmentsTable.createdAt,
    })
    .from(departmentsTable)
    .leftJoin(usersTable, eq(departmentsTable.hodUserId, usersTable.id))
    .orderBy(departmentsTable.name);

  const withCounts = await Promise.all(
    depts.map(async (dept) => {
      const [facResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(and(eq(usersTable.departmentId, dept.id), eq(usersTable.role, "FACULTY")));
      const [studResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(studentsTable)
        .where(eq(studentsTable.departmentId, dept.id));
      return { ...dept, facultyCount: facResult.count, studentCount: studResult.count };
    })
  );

  res.json(withCounts);
});

router.post("/departments", requireAuth, requireRole("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const parsed = CreateDepartmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dept] = await db.insert(departmentsTable).values(parsed.data).returning();
  await logAudit({ userId: req.user!.userId, action: "CREATE_DEPARTMENT", entity: "Department", entityId: dept.id });

  res.status(201).json({ ...dept, hodName: null, facultyCount: 0, studentCount: 0 });
});

router.get("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetDepartmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dept] = await db
    .select({ id: departmentsTable.id, name: departmentsTable.name, code: departmentsTable.code, hodName: usersTable.name, createdAt: departmentsTable.createdAt })
    .from(departmentsTable)
    .leftJoin(usersTable, eq(departmentsTable.hodUserId, usersTable.id))
    .where(eq(departmentsTable.id, params.data.id));

  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  const [facResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(and(eq(usersTable.departmentId, dept.id), eq(usersTable.role, "FACULTY")));
  const [studResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentsTable)
    .where(eq(studentsTable.departmentId, dept.id));

  res.json({ ...dept, facultyCount: facResult.count, studentCount: studResult.count });
});

router.patch("/departments/:id", requireAuth, requireRole("SUPER_ADMIN", "HOD"), async (req, res): Promise<void> => {
  const params = UpdateDepartmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDepartmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dept] = await db
    .update(departmentsTable)
    .set(parsed.data)
    .where(eq(departmentsTable.id, params.data.id))
    .returning();

  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  await logAudit({ userId: req.user!.userId, action: "UPDATE_DEPARTMENT", entity: "Department", entityId: dept.id });
  res.json({ ...dept, hodName: null, facultyCount: null, studentCount: null });
});

router.get("/departments/:id/stats", requireAuth, async (req, res): Promise<void> => {
  const params = GetDepartmentStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deptId = params.data.id;

  const [facResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(and(eq(usersTable.departmentId, deptId), eq(usersTable.role, "FACULTY")));

  const [subjResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subjectsTable)
    .where(eq(subjectsTable.departmentId, deptId));

  const subjects = await db
    .select({ id: subjectsTable.id })
    .from(subjectsTable)
    .where(eq(subjectsTable.departmentId, deptId));

  const subjectIds = subjects.map((s) => s.id);

  let avgCO = 0;
  let weakCOCount = 0;

  if (subjectIds.length > 0) {
    const attainmentRows = await db
      .select({ finalAttainment: finalAttainmentTable.finalAttainment, threshold: finalAttainmentTable.threshold })
      .from(finalAttainmentTable)
      .where(sql`${finalAttainmentTable.subjectId} = ANY(${sql`ARRAY[${sql.raw(subjectIds.join(","))}]`})`);

    if (attainmentRows.length > 0) {
      avgCO = attainmentRows.reduce((s, r) => s + r.finalAttainment, 0) / attainmentRows.length;
      weakCOCount = attainmentRows.filter((r) => r.finalAttainment < r.threshold).length;
    }
  }

  res.json({
    departmentId: deptId,
    avgCOAttainment: Math.round(avgCO * 100) / 100,
    avgPOAttainment: 0,
    subjectCount: subjResult.count,
    facultyCount: facResult.count,
    weakCOCount,
    poBreakdown: [],
  });
});

export default router;
