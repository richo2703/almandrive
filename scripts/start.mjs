import { spawn } from "node:child_process";
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiEntry = resolve(rootDir, "apps/api/dist/index.js");
const botEntry = resolve(rootDir, "apps/bot/dist/index.js");

const envPath = [
  resolve(rootDir, ".env"),
  resolve(rootDir, "apps/api/.env"),
  resolve(rootDir, "apps/bot/.env"),
].find(existsSync);
if (envPath) config({ path: envPath });

function spawnNode(entryFile, label) {
  const child = spawn(process.execPath, [entryFile], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });
  child.on("error", (error) => {
    console.error(`[start] Failed to launch ${label}:`, error);
    process.exitCode = 1;
  });
  return child;
}

const apiProcess = spawnNode(apiEntry, "API");
let botProcess = null;

if (process.env.TELEGRAM_BOT_TOKEN) {
  botProcess = spawnNode(botEntry, "bot");
} else {
  console.log("[start] TELEGRAM_BOT_TOKEN is not set, bot process skipped.");
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of [botProcess, apiProcess]) {
    if (child && !child.killed) {
      child.kill("SIGTERM");
    }
  }
  if (code !== 0) process.exitCode = code;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

apiProcess.on("exit", (code, signal) => {
  console.log(`[start] API exited with code ${code ?? "null"} signal ${signal ?? "null"}`);
  shutdown(code ?? (signal ? 1 : 0));
});

if (botProcess) {
  botProcess.on("exit", (code, signal) => {
    console.log(`[start] Bot exited with code ${code ?? "null"} signal ${signal ?? "null"}`);
    shutdown(code ?? (signal ? 1 : 0));
  });
}
