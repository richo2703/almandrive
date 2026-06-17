import crypto from "node:crypto";

const password = process.argv.slice(2).join(" ").trim();

if (!password) {
  console.error('Usage: npm run admin:hash -- "your-password"');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const derived = crypto.scryptSync(password, salt, 64).toString("hex");

console.log(`scrypt$${salt}$${derived}`);
