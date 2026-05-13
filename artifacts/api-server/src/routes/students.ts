import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { studentsTable, departmentsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { CreateStudentBody, ListStudentsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const params = ListStudentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { departmentId, regulationId, semester, page = 1, limit = 50 } = params.data;
  const offset = (page - 1) * limit;

  const students = await db
    .select({
      id: studentsTable.id,
      rollNumber: studentsTable.rollNumber,
      name: studentsTable.name,
      email: studentsTable.email,
      departmentId: studentsTable.departmentId,
      departmentName: departmentsTable.name,
      regulationId: studentsTable.regulationId,
      semester: studentsTable.semester,
      academicYear: studentsTable.academicYear,
      createdAt: studentsTable.createdAt,
    })
    .from(studentsTable)
    .leftJoin(departmentsTable, eq(studentsTable.departmentId, departmentsTable.id))
    .where(
      and(
        departmentId ? eq(studentsTable.departmentId, departmentId) : undefined,
        regulationId ? eq(studentsTable.regulationId, regulationId) : undefined,
        semester ? eq(studentsTable.semester, semester) : undefined,
      )
    )
    .orderBy(studentsTable.rollNumber)
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentsTable)
    .where(
      and(
        departmentId ? eq(studentsTable.departmentId, departmentId) : undefined,
        regulationId ? eq(studentsTable.regulationId, regulationId) : undefined,
        semester ? eq(studentsTable.semester, semester) : undefined,
      )
    );

  res.json({ data: students, total: countResult.count, page, limit });
});

router.post("/students", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [student] = await db.insert(studentsTable).values(parsed.data).returning();
  res.status(201).json({ ...student, departmentName: null });
});

export default router;
