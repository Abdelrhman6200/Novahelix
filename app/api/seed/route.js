// TEMPORARY one-off seeding endpoint. Disabled unless SEED_TOKEN is set, and
// removed from the codebase right after use.
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

const h = (v) => crypto.createHash("sha256").update(String(v)).digest();

export async function POST(req) {
  const token = process.env.SEED_TOKEN;
  if (!token || token.length < 32) return NextResponse.json({ error: "disabled" }, { status: 404 });
  if (!crypto.timingSafeEqual(h(req.headers.get("x-seed-token") || ""), h(token))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
  const { managerEmail, managerPassword, memberPassword, emails } = await req.json();
  const mEmail = String(managerEmail).trim().toLowerCase();
  const nameOf = (e) => e.split("@")[0];

  let manager = await db.findUserByEmail(mEmail);
  let managerAction = "exists";
  if (manager) {
    await db.setRoleAndManager(mEmail, "manager", null);
  } else {
    manager = await db.createUser({ id: crypto.randomUUID(), name: nameOf(mEmail), email: mEmail, institution: "", passwordHash: hashPassword(managerPassword), role: "manager" });
    managerAction = "created";
  }

  let created = 0, linked = 0;
  const list = [...new Set(emails.map((e) => String(e).trim().toLowerCase()))].filter((e) => e && e !== mEmail);
  for (const email of list) {
    const u = await db.createUser({ id: crypto.randomUUID(), name: nameOf(email), email, institution: "", passwordHash: hashPassword(memberPassword), managerId: manager.id });
    if (u) created++;
    else { await db.setRoleAndManager(email, "member", manager.id); linked++; }
  }
  return NextResponse.json({ manager: managerAction, created, linked });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e).slice(0, 400), code: e?.code, name: e?.name }, { status: 500 });
  }
}
