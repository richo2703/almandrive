import type { NextFunction, Request, Response } from "express";
import { prisma } from "@theorie-direkt/database";
import { env } from "../config/env.js";
import { getAdminCookieToken, readAdminSessionToken } from "../utils/admin-session.js";
import { readSessionToken } from "../utils/telegram.js";

async function resolveTelegramAdmin(req: Request) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const userId = readSessionToken(token, env.TELEGRAM_BOT_TOKEN || "local-development-secret");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramId: true, isAdmin: true, isBlocked: true },
  });
  if (!user || user.isBlocked) return null;
  const allowed = user.isAdmin || env.ADMIN_TELEGRAM_IDS.includes(user.telegramId);
  if (!allowed) return null;
  return { username: userId };
}

export async function resolveAdminIdentity(req: Request) {
  const cookie = getAdminCookieToken(req);
  if (cookie && env.ADMIN_SESSION_SECRET) {
    try {
      return readAdminSessionToken(cookie, env.ADMIN_SESSION_SECRET);
    } catch {
      return null;
    }
  }
  if (req.headers.authorization?.toLowerCase().startsWith("bearer ")) {
    return resolveTelegramAdmin(req);
  }
  return null;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const identity = await resolveAdminIdentity(req);
  if (!identity) {
    res.status(401).json({ error: "Access denied.", code: "admin_auth_required" });
    return;
  }
  next();
}
