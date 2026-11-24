// TEMPORARY one-off import endpoint. Disabled unless SEED_TOKEN is set, and
// removed from the codebase right after use.
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import * as db from "@/lib/db";

export const dynamic = "force-dynamic";

const h = (v) => crypto.createHash("sha256").update(String(v)).digest();

export async function POST(req) {
  const token = process.env.SEED_TOKEN;
  if (!token || token.length < 32) return NextResponse.json({ error: "disabled" }, { status: 404 });
  if (!crypto.timingSafeEqual(h(req.headers.get("x-seed-token") || ""), h(token))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const { projects, links } = await req.json();
    await db.replaceProjects(projects);
    for (const [email, name] of Object.entries(links)) await db.setTrackerNameByEmail(email.toLowerCase(), name);
    const users = await db.listUsers(null);
    return NextResponse.json({ projects: (await db.listProjects()).length, linkedAccounts: users.filter((u) => u.trackerName).length });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e).slice(0, 400) }, { status: 500 });
  }
}
