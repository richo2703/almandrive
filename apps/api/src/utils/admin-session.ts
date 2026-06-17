import crypto from "node:crypto";
import type { Request, Response } from "express";

const ADMIN_SESSION_COOKIE = "alman_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

type AdminSessionPayload = {
  username: string;
  expiresAt: number;
};

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function hashAdminPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyAdminPassword(password: string, hashed: string) {
  const [algorithm, salt, expected] = hashed.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, expected.length / 2).toString("hex");
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createAdminSessionToken(payload: AdminSessionPayload, secret: string) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function readAdminSessionToken(token: string, secret: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Malformed admin session token.");
  const expected = sign(payload, secret);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid admin session token.");
  }
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as AdminSessionPayload;
  if (parsed.expiresAt < Date.now()) throw new Error("Admin session expired.");
  return parsed;
}

export function buildAdminCookie(token: string) {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${ADMIN_SESSION_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function clearAdminCookie() {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=`,
    "HttpOnly",
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function getAdminCookieToken(req: Request) {
  const cookies = req.headers.cookie?.split(";").map((pair) => pair.trim()) ?? [];
  const entry = cookies.find((cookie) => cookie.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  return entry ? decodeURIComponent(entry.slice(ADMIN_SESSION_COOKIE.length + 1)) : null;
}

export function setAdminSessionCookie(res: Response, token: string) {
  res.setHeader("Set-Cookie", buildAdminCookie(token));
}

export function clearAdminSessionCookie(res: Response) {
  res.setHeader("Set-Cookie", clearAdminCookie());
}

export function getAdminSessionMaxAgeSeconds() {
  return ADMIN_SESSION_MAX_AGE_SECONDS;
}
