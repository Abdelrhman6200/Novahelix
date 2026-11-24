// Create a manager account and link member accounts to it. Emails are read from
// a local file (one per line) and are never committed.
//
//   SEED_MANAGER_EMAIL=you@example.com DATABASE_URL=... \
//     node scripts/seed-members.mjs members.txt [--dry-run]
//
// Optional: SEED_MANAGER_PASSWORD, SEED_PASSWORD (both default to 12345678)
import fs from "node:fs";
import crypto from "node:crypto";
import { hashPassword } from "../lib/password.js";

const file = process.argv[2];
const managerEmail = (process.env.SEED_MANAGER_EMAIL || "").trim().toLowerCase();
if (!file || file.startsWith("--") || !managerEmail) {
  console.error("Usage: SEED_MANAGER_EMAIL=... node scripts/seed-members.mjs <emails-file> [--dry-run]");
  process.exit(1);
}
const emails = [...new Set(
  fs.readFileSync(file, "utf8").split(/\r?\n/).map((e) => e.trim().toLowerCase()).filter((e) => /^\S+@\S+\.\S+$/.test(e))
)].filter((e) => e !== managerEmail);
const memberPassword = process.env.SEED_PASSWORD || "12345678";
const managerPassword = process.env.SEED_MANAGER_PASSWORD || "12345678";
const nameOf = (e) => e.split("@")[0]; // placeholder name

if (process.argv.includes("--dry-run")) {
  console.log(`Would create 1 manager and link ${emails.length} members.`);
  process.exit(0);
}

const { createUser, findUserByEmail, setRoleAndManager } = await import("../lib/db.js");

let manager = await findUserByEmail(managerEmail);
if (manager) {
  await setRoleAndManager(managerEmail, "manager", null);
  console.log("manager exists, role set:", managerEmail);
} else {
  manager = await createUser({ id: crypto.randomUUID(), name: nameOf(managerEmail), email: managerEmail, institution: "", passwordHash: hashPassword(managerPassword), role: "manager" });
  console.log("manager created:", managerEmail);
}

let created = 0, linked = 0;
for (const email of emails) {
  const u = await createUser({ id: crypto.randomUUID(), name: nameOf(email), email, institution: "", passwordHash: hashPassword(memberPassword), managerId: manager.id });
  if (u) created++;
  else { await setRoleAndManager(email, "member", manager.id); linked++; }
  console.log(u ? "created " : "linked  ", email);
}
console.log(`Done: ${created} created, ${linked} existing re-linked to the manager.`);
