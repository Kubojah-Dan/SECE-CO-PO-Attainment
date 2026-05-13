import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  courseOutcomesTable, programOutcomesTable, programSpecificOutcomesTable,
  finalAttainmentTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListCOsParams, CreateCOParams, CreateCOBody, UpdateCOParams, UpdateCOBody, DeleteCOParams,
  ListPOsParams, CreatePOParams, CreatePOBody,
  ListPSOsParams, CreatePSOParams, CreatePSOBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { logAudit } from "../services/auditService";

const router: IRouter = Router();

// Course Outcomes
router.get("/subjects/:subjectId/cos", requireAuth, async (req, res): Promise<void> => {
  const params = ListCOsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const cos = await db
    .select()
    .from(courseOutcomesTable)
    .where(eq(courseOutcomesTable.subjectId, params.data.subjectId))
    .orderBy(courseOutcomesTable.code);

  const withAttainment = await Promise.all(
    cos.map(async (co) => {
      const [fa] = await db
        .select({ finalAttainment: finalAttainmentTable.finalAttainment })
        .from(finalAttainmentTable)
        .where(eq(finalAttainmentTable.coId, co.id))
        .limit(1);
      return { ...co, attainmentValue: fa?.finalAttainment ?? null };
    })
  );

  res.json(withAttainment);
});

router.post("/subjects/:subjectId/cos", requireAuth, async (req, res): Promise<void> => {
  const params = CreateCOParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateCOBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [co] = await db
    .insert(courseOutcomesTable)
    .values({ ...parsed.data, subjectId: params.data.subjectId })
    .returning();

  await logAudit({ userId: req.user!.userId, action: "CREATE_CO", entity: "CourseOutcome", entityId: co.id });
  res.status(201).json({ ...co, attainmentValue: null });
});

router.patch("/cos/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCOParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCOBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [co] = await db
    .update(courseOutcomesTable)
    .set(parsed.data)
    .where(eq(courseOutcomesTable.id, params.data.id))
    .returning();

  if (!co) {
    res.status(404).json({ error: "CO not found" });
    return;
  }

  res.json({ ...co, attainmentValue: null });
});

router.delete("/cos/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteCOParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [co] = await db
    .delete(courseOutcomesTable)
    .where(eq(courseOutcomesTable.id, params.data.id))
    .returning();

  if (!co) {
    res.status(404).json({ error: "CO not found" });
    return;
  }

  res.sendStatus(204);
});

// Program Outcomes
router.get("/departments/:departmentId/pos", requireAuth, async (req, res): Promise<void> => {
  const params = ListPOsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const pos = await db
    .select()
    .from(programOutcomesTable)
    .where(eq(programOutcomesTable.departmentId, params.data.departmentId))
    .orderBy(programOutcomesTable.code);

  res.json(pos.map((po) => ({ ...po, attainmentValue: null })));
});

router.post("/departments/:departmentId/pos", requireAuth, async (req, res): Promise<void> => {
  const params = CreatePOParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreatePOBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [po] = await db
    .insert(programOutcomesTable)
    .values({ ...parsed.data, departmentId: params.data.departmentId })
    .returning();

  res.status(201).json({ ...po, attainmentValue: null });
});

// PSOs
router.get("/departments/:departmentId/psos", requireAuth, async (req, res): Promise<void> => {
  const params = ListPSOsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const psos = await db
    .select()
    .from(programSpecificOutcomesTable)
    .where(eq(programSpecificOutcomesTable.departmentId, params.data.departmentId))
    .orderBy(programSpecificOutcomesTable.code);

  res.json(psos.map((p) => ({ ...p, attainmentValue: null })));
});

router.post("/departments/:departmentId/psos", requireAuth, async (req, res): Promise<void> => {
  const params = CreatePSOParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreatePSOBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pso] = await db
    .insert(programSpecificOutcomesTable)
    .values({ ...parsed.data, departmentId: params.data.departmentId })
    .returning();

  res.status(201).json({ ...pso, attainmentValue: null });
});

export default router;
