import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { readSessionToken } from "../utils/telegram.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  try {
    req.userId = readSessionToken(token, env.TELEGRAM_BOT_TOKEN || "local-development-secret");
    next();
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Invalid session." });
  }
}
