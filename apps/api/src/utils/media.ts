import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const projectRoot = resolve(apiRoot, "..", "..");

export function getMediaRootDir() {
  return env.MEDIA_ROOT_DIR || resolve(projectRoot, "media");
}

export function ensureMediaRootExists() {
  return existsSync(getMediaRootDir());
}
