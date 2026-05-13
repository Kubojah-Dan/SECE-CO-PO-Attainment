import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, departmentsTable, auditLogsTable } from "@workspace/db";
import { eq, and, like, sql, desc } from "drizzle-orm";
import {
  CreateUserBody,
  UpdateUserBody,
  GetUserParams,
  UpdateUserParams,
  DeleteUserParams,
  ListUsersQueryParams,
  ListAuditLogsQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../services/auditService";

const router: IRouter = Router();

router.get("/users", requireAuth, requireRole("SUPER_ADMIN", "HOD"), async (req, res): Promise<void> => {
  const params = ListUsersQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { role, departmentId, page = 1, limit = 20 } = params.data;
  const offset = (page - 1) * limit;

  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      isActive: usersTable.isActive,
      departmentId: usersTable.departmentId,
      departmentName: departmentsTable.name,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
    .where(
      and(
        role ? eq(usersTable.role, role as "SUPER_ADMIN" | "HOD" | "FACULTY" | "IQAC") : undefined,
        departmentId ? eq(usersTable.departmentId, departmentId) : undefined,
      )
    )
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(
      and(
        role ? eq(usersTable.role, role as "SUPER_ADMIN" | "HOD" | "FACULTY" | "IQAC") : undefined,
        departmentId ? eq(usersTable.departmentId, departmentId) : undefined,
      )
    );

  res.json({ data: users, total: countResult.count, page, limit });
});

router.post("/users", requireAuth, requireRole("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password, ...userData } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({ ...userData, passwordHash })
    .returning();

  await logAudit({ userId: req.user!.userId, action: "CREATE_USER", entity: "User", entityId: user.id });

  res.status(201).json({
    id: user.id, name: user.name, email: user.email, role: user.role,
    isActive: user.isActive, departmentId: user.departmentId, departmentName: null, createdAt: user.createdAt,
  });
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role,
      isActive: usersTable.isActive, departmentId: usersTable.departmentId,
      departmentName: departmentsTable.name, createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
    .where(eq(usersTable.id, params.data.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

router.patch("/users/:id", requireAuth, requireRole("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await logAudit({ userId: req.user!.userId, action: "UPDATE_USER", entity: "User", entityId: user.id });

  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, departmentId: user.departmentId, departmentName: null, createdAt: user.createdAt });
});

router.delete("/users/:id", requireAuth, requireRole("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await logAudit({ userId: req.user!.userId, action: "DELETE_USER", entity: "User", entityId: params.data.id });
  res.sendStatus(204);
});

router.get("/audit-logs", requireAuth, requireRole("SUPER_ADMIN", "IQAC"), async (req, res): Promise<void> => {
  const params = ListAuditLogsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { userId, action, page = 1, limit = 50 } = params.data;
  const offset = (page - 1) * limit;

  const logs = await db
    .select({
      id: auditLogsTable.id,
      userId: auditLogsTable.userId,
      userName: usersTable.name,
      action: auditLogsTable.action,
      entity: auditLogsTable.entity,
      entityId: auditLogsTable.entityId,
      details: auditLogsTable.details,
      ipAddress: auditLogsTable.ipAddress,
      createdAt: auditLogsTable.createdAt,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .where(
      and(
        userId ? eq(auditLogsTable.userId, userId) : undefined,
        action ? eq(auditLogsTable.action, action) : undefined,
      )
    )
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogsTable);

  res.json({ data: logs, total: countResult.count, page, limit });
});

export default router;
