import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { studentMarksTable, courseOutcomesTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ListMarksParams, CreateMarkParams, CreateMarkBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/subjects/:subjectId/marks", requireAuth, async (req, res): Promise<void> => {
  const params = ListMarksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: studentMarksTable.id,
      studentId: studentMarksTable.studentId,
      studentName: studentsTable.name,
      rollNumber: studentsTable.rollNumber,
      subjectId: studentMarksTable.subjectId,
      coId: studentMarksTable.coId,
      coCode: courseOutcomesTable.code,
      examType: studentMarksTable.examType,
      marksObtained: studentMarksTable.marksObtained,
      maxMarks: studentMarksTable.maxMarks,
      createdAt: studentMarksTable.createdAt,
    })
    .from(studentMarksTable)
    .leftJoin(studentsTable, eq(studentMarksTable.studentId, studentsTable.id))
    .leftJoin(courseOutcomesTable, eq(studentMarksTable.coId, courseOutcomesTable.id))
    .where(eq(studentMarksTable.subjectId, params.data.subjectId))
    .orderBy(studentsTable.rollNumber);

  res.json(rows);
});

router.post("/subjects/:subjectId/marks", requireAuth, async (req, res): Promise<void> => {
  const params = CreateMarkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateMarkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [mark] = await db
    .insert(studentMarksTable)
    .values({ subjectId: params.data.subjectId, ...parsed.data })
    .returning();

  res.status(201).json({ ...mark, studentName: null, rollNumber: null, coCode: null });
});

export default router;
