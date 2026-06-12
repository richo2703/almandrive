import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const envPath = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
].find(existsSync);
if (envPath) config({ path: envPath });

export const env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_APP_URL: z.string().url().default("http://localhost:5173"),
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  TELEGRAM_AUTH_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(86400),
  DEV_AUTH_ENABLED: z.string().default("false").transform((value) => value === "true"),
}).parse(process.env);
