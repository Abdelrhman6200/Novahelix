import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserById } from "./db";
import { hashPassword } from "./password";
export { hashPassword };

const COOKIE = "nh_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET (32+ chars) is required in production");
  }
  return "dev-only-insecure-secret-dev-only-insecure";
}

const sign = (payload) =>
  crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(hash, "hex");
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

export function isAdminLogin(email, password) {
  const ae = process.env.ADMIN_EMAIL;
  const ap = process.env.ADMIN_PASSWORD;
  if (!ae || !ap) return false;
  const h = (v) => crypto.createHash("sha256").update(v).digest();
  const okEmail = crypto.timingSafeEqual(h(email.toLowerCase()), h(ae.toLowerCase()));
  const okPass = crypto.timingSafeEqual(h(password), h(ap));
  return okEmail && okPass;
}

export function isAdminEmail(email) {
  const ae = process.env.ADMIN_EMAIL;
  return !!ae && ae.toLowerCase() === email.toLowerCase();
}

export async function startSession({ uid, role }) {
  const payload = Buffer.from(
    JSON.stringify({ uid, role, exp: Date.now() + MAX_AGE * 1000 })
  ).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

// Returns { role: "admin" } | { role: "member", user } | null
export async function getSession() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  )
    return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  if (!data.exp || data.exp < Date.now()) return null;
  if (data.role === "admin") {
    return process.env.ADMIN_EMAIL ? { role: "admin" } : null;
  }
  const user = await findUserById(data.uid);
  return user ? { role: user.role === "manager" ? "manager" : "member", user } : null;
}

// Full admin (env) or a manager. scope = null for full access, else the manager's id.
export async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role === "member") redirect("/login?as=admin");
  return { scope: s.role === "manager" ? s.user.id : null, session: s };
}

export async function requireMember() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
