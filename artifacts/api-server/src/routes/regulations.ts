import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { regulationsTable, departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateRegulationBody, ListRegulationsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { logAudit } from "../services/auditService";

const router: IRouter = Router();

router.get("/regulations", requireAuth, async (req, res): Promise<void> => {
  const params = ListRegulationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { departmentId } = params.data;

  const regs = await db
    .select({
      id: regulationsTable.id,
      name: regulationsTable.name,
      year: regulationsTable.year,
      departmentId: regulationsTable.departmentId,
      departmentName: departmentsTable.name,
      createdAt: regulationsTable.createdAt,
    })
    .from(regulationsTable)
    .leftJoin(departmentsTable, eq(regulationsTable.departmentId, departmentsTable.id))
    .where(departmentId ? eq(regulationsTable.departmentId, departmentId) : undefined)
    .orderBy(regulationsTable.year);

  res.json(regs);
});

router.post("/regulations", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRegulationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [reg] = await db.insert(regulationsTable).values(parsed.data).returning();
  await logAudit({ userId: req.user!.userId, action: "CREATE_REGULATION", entity: "Regulation", entityId: reg.id });

  res.status(201).json({ ...reg, departmentName: null });
});

export default router;
