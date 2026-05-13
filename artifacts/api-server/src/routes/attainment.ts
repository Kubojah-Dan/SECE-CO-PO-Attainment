import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  finalAttainmentTable, courseOutcomesTable, indirectAttainmentTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GetCOAttainmentParams, CalculateAttainmentParams, CalculateAttainmentBody,
  GetPOAttainmentParams, GetPSOAttainmentParams,
  GetIndirectAttainmentParams, SaveIndirectAttainmentParams, SaveIndirectAttainmentBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import {
  calculateCOAttainment,
  calculatePOAttainment,
  calculatePSOAttainment,
} from "../services/attainmentEngine";
import { logAudit } from "../services/auditService";

const router: IRouter = Router();

router.get("/attainment/subjects/:subjectId/co", requireAuth, async (req, res): Promise<void> => {
  const params = GetCOAttainmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const cos = await db
    .select()
    .from(courseOutcomesTable)
    .where(eq(courseOutcomesTable.subjectId, params.data.subjectId));

  const results = await Promise.all(
    cos.map(async (co) => {
      const [fa] = await db
        .select()
        .from(finalAttainmentTable)
        .where(and(eq(finalAttainmentTable.subjectId, params.data.subjectId), eq(finalAttainmentTable.coId, co.id)))
        .limit(1);

      return {
        coId: co.id,
        coCode: co.code,
        description: co.description,
        directAttainment: fa?.directAttainment ?? 0,
        indirectAttainment: fa?.indirectAttainment ?? 0,
        directWeightage: fa?.directWeightage ?? 0.8,
        indirectWeightage: fa?.indirectWeightage ?? 0.2,
        finalAttainment: fa?.finalAttainment ?? 0,
        threshold: fa?.threshold ?? 60,
        isAttained: fa?.isAttained ?? false,
        studentCount: null,
        attainedCount: null,
      };
    })
  );

  res.json(results);
});

router.post("/attainment/subjects/:subjectId/calculate", requireAuth, async (req, res): Promise<void> => {
  const params = CalculateAttainmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CalculateAttainmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const cos = await calculateCOAttainment({
    subjectId: params.data.subjectId,
    directWeightage: parsed.data.directWeightage,
    indirectWeightage: parsed.data.indirectWeightage,
    threshold: parsed.data.threshold,
    academicYear: parsed.data.academicYear ?? null,
  });

  const overallAttainment = cos.length > 0
    ? cos.reduce((s, c) => s + c.finalAttainment, 0) / cos.length
    : 0;

  await logAudit({
    userId: req.user!.userId,
    action: "CALCULATE_ATTAINMENT",
    entity: "Subject",
    entityId: params.data.subjectId,
  });

  res.json({
    subjectId: params.data.subjectId,
    calculatedAt: new Date(),
    cos,
    overallAttainment: Math.round(overallAttainment * 100) / 100,
  });
});

router.get("/attainment/departments/:departmentId/po", requireAuth, async (req, res): Promise<void> => {
  const params = GetPOAttainmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const results = await calculatePOAttainment(params.data.departmentId);
  res.json(results);
});

router.get("/attainment/departments/:departmentId/pso", requireAuth, async (req, res): Promise<void> => {
  const params = GetPSOAttainmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const results = await calculatePSOAttainment(params.data.departmentId);
  res.json(results);
});

router.get("/attainment/subjects/:subjectId/indirect", requireAuth, async (req, res): Promise<void> => {
  const params = GetIndirectAttainmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({ ia: indirectAttainmentTable, coCode: courseOutcomesTable.code })
    .from(indirectAttainmentTable)
    .leftJoin(courseOutcomesTable, eq(indirectAttainmentTable.coId, courseOutcomesTable.id))
    .where(eq(indirectAttainmentTable.subjectId, params.data.subjectId));

  res.json(rows.map((r) => ({ ...r.ia, coCode: r.coCode })));
});

router.post("/attainment/subjects/:subjectId/indirect", requireAuth, async (req, res): Promise<void> => {
  const params = SaveIndirectAttainmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SaveIndirectAttainmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(indirectAttainmentTable)
    .values({ subjectId: params.data.subjectId, ...parsed.data })
    .returning();

  res.status(201).json({ ...row, coCode: null });
});

export default router;
