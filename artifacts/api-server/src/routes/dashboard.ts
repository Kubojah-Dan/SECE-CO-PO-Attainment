import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable, departmentsTable, studentsTable, subjectsTable,
  courseOutcomesTable, finalAttainmentTable, coPOMappingsTable,
  auditLogsTable, uploadJobsTable,
} from "@workspace/db";
import { eq, and, sql, desc, lt, avg } from "drizzle-orm";
import {
  GetDashboardSummaryQueryParams, GetCOTrendsQueryParams, GetWeakCOsQueryParams,
  GetDepartmentComparisonQueryParams, GetFacultyProgressQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const params = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [[deptCount], [facultyCount], [studentCount], [subjectCount]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(departmentsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "FACULTY")),
    db.select({ count: sql<number>`count(*)::int` }).from(studentsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(subjectsTable),
  ]);

  const attainmentRows = await db
    .select({ finalAttainment: finalAttainmentTable.finalAttainment })
    .from(finalAttainmentTable);

  const avgCO = attainmentRows.length > 0
    ? attainmentRows.reduce((s, r) => s + r.finalAttainment, 0) / attainmentRows.length
    : 0;

  const [pendingMappings] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(coPOMappingsTable)
    .where(eq(coPOMappingsTable.isApproved, false));

  const [activeJobs] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(uploadJobsTable)
    .where(eq(uploadJobsTable.status, "processing"));

  const recentLogs = await db
    .select({
      id: auditLogsTable.id,
      action: auditLogsTable.action,
      user: usersTable.name,
      entity: auditLogsTable.entity,
      timestamp: auditLogsTable.createdAt,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(10);

  const depts = await db.select({ id: departmentsTable.id, name: departmentsTable.name }).from(departmentsTable).limit(5);
  const topDepts = await Promise.all(
    depts.map(async (d) => {
      const subs = await db.select({ id: subjectsTable.id }).from(subjectsTable).where(eq(subjectsTable.departmentId, d.id));
      const ids = subs.map((s) => s.id);
      let avgCODept = 0;
      if (ids.length > 0) {
        const rows = await db.select({ v: finalAttainmentTable.finalAttainment }).from(finalAttainmentTable)
          .where(sql`${finalAttainmentTable.subjectId} = ANY(${sql`ARRAY[${sql.raw(ids.join(",") || "0")}]::int[]`})`);
        avgCODept = rows.length > 0 ? rows.reduce((s, r) => s + r.v, 0) / rows.length : 0;
      }
      return {
        departmentId: d.id, departmentName: d.name,
        avgCOAttainment: Math.round(avgCODept * 100) / 100,
        avgPOAttainment: 0, subjectCount: ids.length, trend: null,
      };
    })
  );

  res.json({
    totalDepartments: deptCount.count,
    totalFaculty: facultyCount.count,
    totalStudents: studentCount.count,
    totalSubjects: subjectCount.count,
    avgCOAttainment: Math.round(avgCO * 100) / 100,
    avgPOAttainment: 0,
    pendingMappings: pendingMappings.count,
    uploadJobs: activeJobs.count,
    recentActivity: recentLogs.map((l) => ({
      id: l.id, action: l.action, user: l.user ?? "System",
      entity: l.entity, timestamp: l.timestamp,
    })),
    topPerformingDepts: topDepts.sort((a, b) => b.avgCOAttainment - a.avgCOAttainment).slice(0, 5),
  });
});

router.get("/dashboard/co-trends", requireAuth, async (req, res): Promise<void> => {
  const params = GetCOTrendsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { subjectId } = params.data;

  if (subjectId) {
    const rows = await db
      .select({
        coCode: courseOutcomesTable.code,
        finalAttainment: finalAttainmentTable.finalAttainment,
        calculatedAt: finalAttainmentTable.calculatedAt,
        academicYear: finalAttainmentTable.academicYear,
      })
      .from(finalAttainmentTable)
      .leftJoin(courseOutcomesTable, eq(finalAttainmentTable.coId, courseOutcomesTable.id))
      .where(eq(finalAttainmentTable.subjectId, subjectId))
      .orderBy(finalAttainmentTable.calculatedAt);

    res.json(rows.map((r) => ({
      coCode: r.coCode ?? "CO",
      subjectName: null,
      period: r.academicYear ?? r.calculatedAt?.toISOString().slice(0, 7) ?? "N/A",
      attainmentValue: r.finalAttainment,
    })));
    return;
  }

  const rows = await db
    .select({
      coCode: courseOutcomesTable.code,
      finalAttainment: finalAttainmentTable.finalAttainment,
      academicYear: finalAttainmentTable.academicYear,
      calculatedAt: finalAttainmentTable.calculatedAt,
    })
    .from(finalAttainmentTable)
    .leftJoin(courseOutcomesTable, eq(finalAttainmentTable.coId, courseOutcomesTable.id))
    .orderBy(finalAttainmentTable.calculatedAt)
    .limit(50);

  res.json(rows.map((r) => ({
    coCode: r.coCode ?? "CO",
    subjectName: null,
    period: r.academicYear ?? r.calculatedAt?.toISOString().slice(0, 7) ?? "N/A",
    attainmentValue: r.finalAttainment,
  })));
});

router.get("/dashboard/weak-cos", requireAuth, async (req, res): Promise<void> => {
  const params = GetWeakCOsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const threshold = params.data.threshold ?? 60;

  const rows = await db
    .select({
      coId: courseOutcomesTable.id,
      coCode: courseOutcomesTable.code,
      description: courseOutcomesTable.description,
      subjectName: subjectsTable.name,
      subjectCode: subjectsTable.code,
      departmentName: departmentsTable.name,
      facultyName: usersTable.name,
      attainmentValue: finalAttainmentTable.finalAttainment,
      threshold: finalAttainmentTable.threshold,
    })
    .from(finalAttainmentTable)
    .leftJoin(courseOutcomesTable, eq(finalAttainmentTable.coId, courseOutcomesTable.id))
    .leftJoin(subjectsTable, eq(finalAttainmentTable.subjectId, subjectsTable.id))
    .leftJoin(departmentsTable, eq(subjectsTable.departmentId, departmentsTable.id))
    .leftJoin(usersTable, eq(subjectsTable.facultyId, usersTable.id))
    .where(lt(finalAttainmentTable.finalAttainment, threshold))
    .orderBy(finalAttainmentTable.finalAttainment)
    .limit(50);

  res.json(rows.map((r) => ({
    coId: r.coId ?? 0,
    coCode: r.coCode ?? "CO",
    description: r.description ?? "",
    subjectName: r.subjectName ?? "",
    subjectCode: r.subjectCode ?? "",
    departmentName: r.departmentName ?? "",
    facultyName: r.facultyName,
    attainmentValue: r.attainmentValue,
    threshold: r.threshold,
    gap: r.threshold - r.attainmentValue,
  })));
});

router.get("/dashboard/department-comparison", requireAuth, async (req, res): Promise<void> => {
  const depts = await db
    .select({ id: departmentsTable.id, name: departmentsTable.name })
    .from(departmentsTable);

  const results = await Promise.all(
    depts.map(async (d) => {
      const subs = await db.select({ id: subjectsTable.id }).from(subjectsTable).where(eq(subjectsTable.departmentId, d.id));
      const ids = subs.map((s) => s.id);
      let avgCO = 0;
      if (ids.length > 0) {
        const rows = await db
          .select({ v: finalAttainmentTable.finalAttainment })
          .from(finalAttainmentTable)
          .where(sql`${finalAttainmentTable.subjectId} = ANY(${sql`ARRAY[${sql.raw(ids.join(",") || "0")}]::int[]`})`);
        avgCO = rows.length > 0 ? rows.reduce((s, r) => s + r.v, 0) / rows.length : 0;
      }
      return {
        departmentId: d.id, departmentName: d.name,
        avgCOAttainment: Math.round(avgCO * 100) / 100,
        avgPOAttainment: 0, subjectCount: ids.length, trend: null as string | null,
      };
    })
  );

  res.json(results);
});

router.get("/dashboard/faculty-progress", requireAuth, async (req, res): Promise<void> => {
  const params = GetFacultyProgressQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { departmentId } = params.data;

  const faculty = await db
    .select({
      id: usersTable.id, name: usersTable.name,
      departmentName: departmentsTable.name,
      departmentId: usersTable.departmentId,
    })
    .from(usersTable)
    .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
    .where(and(
      eq(usersTable.role, "FACULTY"),
      departmentId ? eq(usersTable.departmentId, departmentId) : undefined,
    ));

  const results = await Promise.all(
    faculty.map(async (f) => {
      const subs = await db.select({ id: subjectsTable.id }).from(subjectsTable).where(eq(subjectsTable.facultyId, f.id));
      const ids = subs.map((s) => s.id);
      let completedSubjects = 0;
      let avgAttainment = 0;
      if (ids.length > 0) {
        const rows = await db
          .select({ subjectId: finalAttainmentTable.subjectId, v: finalAttainmentTable.finalAttainment })
          .from(finalAttainmentTable)
          .where(sql`${finalAttainmentTable.subjectId} = ANY(${sql`ARRAY[${sql.raw(ids.join(",") || "0")}]::int[]`})`);
        const uniqueSubs = new Set(rows.map((r) => r.subjectId));
        completedSubjects = uniqueSubs.size;
        avgAttainment = rows.length > 0 ? rows.reduce((s, r) => s + r.v, 0) / rows.length : 0;
      }
      return {
        userId: f.id, name: f.name, departmentName: f.departmentName ?? "",
        subjectCount: ids.length, completedSubjects,
        pendingSubjects: ids.length - completedSubjects,
        avgAttainment: Math.round(avgAttainment * 100) / 100,
        lastActivity: null,
      };
    })
  );

  res.json(results);
});

export default router;
