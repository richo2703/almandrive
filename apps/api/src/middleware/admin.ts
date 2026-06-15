import type { NextFunction, Request, Response } from "express";
import { prisma } from "@theorie-direkt/database";
import { env } from "../config/env.js";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramId: true, isAdmin: true, isBlocked: true },
  });
  if (!user || user.isBlocked) {
    res.status(403).json({ error: "Access denied." });
    return;
  }
  const allowed = user.isAdmin || env.ADMIN_TELEGRAM_IDS.includes(user.telegramId);
  if (!allowed) {
    res.status(403).json({ error: "Access denied." });
    return;
  }
  next();
}
