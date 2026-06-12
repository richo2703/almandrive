import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const candidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
];
const envPath = candidates.find(existsSync);
if (envPath) config({ path: envPath });
