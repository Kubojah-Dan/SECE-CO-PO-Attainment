import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  coPOMappingsTable, courseOutcomesTable, programOutcomesTable,
  programSpecificOutcomesTable, usersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListMappingsParams, CreateMappingParams, CreateMappingBody,
  UpdateMappingParams, UpdateMappingBody, DeleteMappingParams, ApproveMappingParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../services/auditService";

const router: IRouter = Router();

router.get("/subjects/:subjectId/mappings", requireAuth, async (req, res): Promise<void> => {
  const params = ListMappingsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const cos = await db
    .select()
    .from(courseOutcomesTable)
    .where(eq(courseOutcomesTable.subjectId, params.data.subjectId));

  if (cos.length === 0) {
    res.json([]);
    return;
  }

  const allMappings = [];
  for (const co of cos) {
    const mappings = await db
      .select()
      .from(coPOMappingsTable)
      .where(eq(coPOMappingsTable.coId, co.id));

    for (const m of mappings) {
      let targetCode: string | null = null;
      if (m.targetType === "PO") {
        const [po] = await db
          .select({ code: programOutcomesTable.code })
          .from(programOutcomesTable)
          .where(eq(programOutcomesTable.id, m.targetId));
        targetCode = po?.code ?? null;
      } else {
        const [pso] = await db
          .select({ code: programSpecificOutcomesTable.code })
          .from(programSpecificOutcomesTable)
          .where(eq(programSpecificOutcomesTable.id, m.targetId));
        targetCode = pso?.code ?? null;
      }

      let approvedBy: string | null = null;
      if (m.approvedById) {
        const [approver] = await db
          .select({ name: usersTable.name })
          .from(usersTable)
          .where(eq(usersTable.id, m.approvedById));
        approvedBy = approver?.name ?? null;
      }

      allMappings.push({
        ...m,
        coCode: co.code,
        targetCode,
        approvedBy,
      });
    }
  }

  res.json(allMappings);
});

router.post("/subjects/:subjectId/mappings", requireAuth, async (req, res): Promise<void> => {
  const params = CreateMappingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateMappingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [mapping] = await db
    .insert(coPOMappingsTable)
    .values(parsed.data)
    .returning();

  await logAudit({ userId: req.user!.userId, action: "CREATE_MAPPING", entity: "Mapping", entityId: mapping.id });

  res.status(201).json({ ...mapping, coCode: null, targetCode: null, approvedBy: null });
});

router.patch("/mappings/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateMappingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMappingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [mapping] = await db
    .update(coPOMappingsTable)
    .set(parsed.data)
    .where(eq(coPOMappingsTable.id, params.data.id))
    .returning();

  if (!mapping) {
    res.status(404).json({ error: "Mapping not found" });
    return;
  }

  res.json({ ...mapping, coCode: null, targetCode: null, approvedBy: null });
});

router.delete("/mappings/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteMappingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [mapping] = await db
    .delete(coPOMappingsTable)
    .where(eq(coPOMappingsTable.id, params.data.id))
    .returning();

  if (!mapping) {
    res.status(404).json({ error: "Mapping not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/mappings/:id/approve", requireAuth, requireRole("HOD", "SUPER_ADMIN"), async (req, res): Promise<void> => {
  const params = ApproveMappingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [mapping] = await db
    .update(coPOMappingsTable)
    .set({ isApproved: true, approvedById: req.user!.userId })
    .where(eq(coPOMappingsTable.id, params.data.id))
    .returning();

  if (!mapping) {
    res.status(404).json({ error: "Mapping not found" });
    return;
  }

  await logAudit({ userId: req.user!.userId, action: "APPROVE_MAPPING", entity: "Mapping", entityId: mapping.id });
  res.json({ ...mapping, coCode: null, targetCode: null, approvedBy: null });
});

export default router;
