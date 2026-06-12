import crypto from "node:crypto";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number,
) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("Telegram initData has no hash.");

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const actualBuffer = Buffer.from(hash, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("Telegram initData signature is invalid.");
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
    throw new Error("Telegram initData has expired.");
  }

  const rawUser = params.get("user");
  if (!rawUser) throw new Error("Telegram initData has no user.");
  return JSON.parse(rawUser) as TelegramUser;
}

export function createSessionToken(userId: string, secret: string) {
  const payload = Buffer.from(
    JSON.stringify({ userId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }),
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readSessionToken(token: string, secret: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Malformed session token.");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    throw new Error("Invalid session token.");
  }
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
    userId: string;
    expiresAt: number;
  };
  if (parsed.expiresAt < Date.now()) throw new Error("Session token expired.");
  return parsed.userId;
}
