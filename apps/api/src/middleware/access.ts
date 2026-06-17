import type { NextFunction, Request, Response } from "express";
import { prisma } from "@theorie-direkt/database";

export async function hasActiveAccess(userId: string) {
  const access = await prisma.userAccess.findFirst({
    where: {
      userId,
      isActive: true,
      revokedAt: null,
      OR: [{ isLifetime: true }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return Boolean(access);
}

export async function requireActiveAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required.", code: "AUTH_REQUIRED" });
    return;
  }
  if (!(await hasActiveAccess(req.userId))) {
    res.status(403).json({ error: "Payment required.", code: "payment_required" });
    return;
  }
  next();
}
