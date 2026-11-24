// Create member accounts from a local file (one email per line). The list is
// never committed: keep it outside the repo or in the gitignored members.txt.
//
//   DATABASE_URL=... node scripts/seed-members.mjs members.txt [--dry-run]
//   Optional: SEED_PASSWORD=... (defaults to 12345678)
import fs from "node:fs";
import crypto from "node:crypto";
import { hashPassword } from "../lib/password.js";

const file = process.argv[2];
if (!file || file.startsWith("--")) {
  console.error("Usage: node scripts/seed-members.mjs <emails-file> [--dry-run]");
  process.exit(1);
}
const emails = [...new Set(
  fs.readFileSync(file, "utf8").split(/\r?\n/).map((e) => e.trim().toLowerCase()).filter((e) => /^\S+@\S+\.\S+$/.test(e))
)];
const password = process.env.SEED_PASSWORD || "12345678";
const nameOf = (e) => e.split("@")[0]; // placeholder name

if (process.argv.includes("--dry-run")) {
  console.log(`Would create ${emails.length} members (password length ${password.length}).`);
  process.exit(0);
}

const { createUser } = await import("../lib/db.js");
let created = 0, existing = 0;
for (const email of emails) {
  const u = await createUser({ id: crypto.randomUUID(), name: nameOf(email), email, institution: "", passwordHash: hashPassword(password) });
  u ? created++ : existing++;
  console.log(u ? "created " : "exists  ", email);
}
console.log(`Done: ${created} created, ${existing} already existed.`);
