// TEMPORARY one-off import endpoint. Disabled unless SEED_TOKEN is set, and
// removed from the codebase right after use.
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const h = (v) => crypto.createHash("sha256").update(String(v)).digest();

export async function POST(req) {
  const token = process.env.SEED_TOKEN;
  if (!token || token.length < 32) return NextResponse.json({ error: "disabled" }, { status: 404 });
  if (!crypto.timingSafeEqual(h(req.headers.get("x-seed-token") || ""), h(token))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const { ideas, cleanup } = await req.json();
    if (cleanup) {
      const q = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);
      const rows = await q`DELETE FROM novahelix.idea_responses WHERE body = ${cleanup} RETURNING id`;
      return NextResponse.json({ removed: rows.length });
    }
    const managers = (await db.listUsers(null)).filter((u) => u.role === "manager");
    if (managers.length !== 1) return NextResponse.json({ error: "expected exactly one manager", found: managers.length }, { status: 409 });
    const manager = managers[0];
    await db.importIdeas(manager.id, ideas);
    const all = await db.listIdeasForManager(manager.id);
    return NextResponse.json({ ideas: all.length, best: all.filter((i) => i.best).length, fields: new Set(all.map((i) => i.field)).size });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e).slice(0, 400) }, { status: 500 });
  }
}
