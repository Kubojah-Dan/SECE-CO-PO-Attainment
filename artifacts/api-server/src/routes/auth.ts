import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable, departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody, RefreshTokenBody } from "@workspace/api-zod";
import { requireAuth, type AuthPayload } from "../middlewares/auth";
import { logAudit } from "../services/auditService";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "dev-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.SESSION_SECRET || "dev-refresh-secret";

function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const payload: AuthPayload = {
    userId: user.id,
    role: user.role,
    departmentId: user.departmentId,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await db
    .update(usersTable)
    .set({ refreshToken })
    .where(eq(usersTable.id, user.id));

  let departmentName: string | null = null;
  if (user.departmentId) {
    const [dept] = await db
      .select({ name: departmentsTable.name })
      .from(departmentsTable)
      .where(eq(departmentsTable.id, user.departmentId));
    departmentName = dept?.name ?? null;
  }

  await logAudit({ userId: user.id, action: "LOGIN", entity: "User", entityId: user.id, ipAddress: req.ip });

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      departmentName,
    },
  });
});

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const parsed = RefreshTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "refreshToken required" });
    return;
  }

  try {
    const payload = jwt.verify(parsed.data.refreshToken, JWT_REFRESH_SECRET) as AuthPayload;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId));

    if (!user || user.refreshToken !== parsed.data.refreshToken) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }

    const newPayload: AuthPayload = {
      userId: user.id,
      role: user.role,
      departmentId: user.departmentId,
    };

    const accessToken = signAccessToken(newPayload);
    const refreshToken = signRefreshToken(newPayload);

    await db
      .update(usersTable)
      .set({ refreshToken })
      .where(eq(usersTable.id, user.id));

    let departmentName: string | null = null;
    if (user.departmentId) {
      const [dept] = await db
        .select({ name: departmentsTable.name })
        .from(departmentsTable)
        .where(eq(departmentsTable.id, user.departmentId));
      departmentName = dept?.name ?? null;
    }

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, departmentId: user.departmentId, departmentName },
    });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  if (req.user) {
    await db
      .update(usersTable)
      .set({ refreshToken: null })
      .where(eq(usersTable.id, req.user.userId));
  }
  res.sendStatus(204);
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let departmentName: string | null = null;
  if (user.departmentId) {
    const [dept] = await db
      .select({ name: departmentsTable.name })
      .from(departmentsTable)
      .where(eq(departmentsTable.id, user.departmentId));
    departmentName = dept?.name ?? null;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
    departmentName,
  });
});

export default router;
