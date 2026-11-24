"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as db from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  isAdminLogin,
  isAdminEmail,
  startSession,
  endSession,
  getSession,
  requireAdmin,
  requireMember,
} from "@/lib/auth";

const str = (fd, k, max) => String(fd.get(k) ?? "").trim().slice(0, max);
const fail = (path, msg) => redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
const id = () => crypto.randomUUID();

// Activity recorder. `s` is a session ({ role, user? }); never throws, never records secrets.
const record = (s, event, detail) =>
  db.logActivity({
    level: s?.role || "unknown",
    actorId: s?.user?.id ?? null,
    actorEmail: s?.user?.email ?? (s?.role === "admin" ? "(administrator)" : null),
    event,
    detail,
  });
const levelOf = (user) => (user.role === "manager" ? "manager" : "member");

export async function register(fd) {
  const name = str(fd, "name", 100);
  const email = str(fd, "email", 200).toLowerCase();
  const institution = str(fd, "institution", 200);
  const password = String(fd.get("password") ?? "");
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) fail("/register", "Enter a name and a valid email.");
  if (password.length < 10) fail("/register", "Password must be at least 10 characters.");
  if (isAdminEmail(email)) fail("/register", "That email can't be registered.");
  const user = await db.createUser({ id: id(), name, email, institution, passwordHash: hashPassword(password) });
  if (!user) fail("/register", "An account with that email already exists.");
  await startSession({ uid: user.id, role: "member" });
  await record({ role: "member", user }, "register", "New member account created");
  redirect("/dashboard");
}

export async function login(fd) {
  const email = str(fd, "email", 200).toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (isAdminLogin(email, password)) {
    await startSession({ uid: "admin", role: "admin" });
    await record({ role: "admin" }, "signin", "Member sign-in form");
    redirect("/admin");
  }
  const user = await db.findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    await db.logActivity({ level: "unknown", actorEmail: email, event: "signin_failed", detail: "Member sign-in form" });
    fail("/login", "Invalid email or password.");
  }
  await startSession({ uid: user.id, role: "member" });
  await db.logActivity({ level: levelOf(user), actorId: user.id, actorEmail: user.email, event: "signin", detail: "Member sign-in form" });
  redirect(user.role === "manager" ? "/admin" : "/dashboard");
}

export async function adminLogin(fd) {
  const email = str(fd, "email", 200).toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (isAdminLogin(email, password)) {
    await startSession({ uid: "admin", role: "admin" });
    await record({ role: "admin" }, "signin", "Manager sign-in form");
    redirect("/admin");
  }
  const user = await db.findUserByEmail(email);
  if (!user || user.role !== "manager" || !verifyPassword(password, user.passwordHash)) {
    await db.logActivity({ level: "unknown", actorEmail: email, event: "signin_failed", detail: "Manager sign-in form" });
    fail("/login?as=admin", "Invalid administrator credentials.");
  }
  await startSession({ uid: user.id, role: "member" });
  await db.logActivity({ level: "manager", actorId: user.id, actorEmail: user.email, event: "signin", detail: "Manager sign-in form" });
  redirect("/admin");
}

export async function logout() {
  const s = await getSession();
  if (s) await record(s, "signout", null);
  await endSession();
  redirect("/");
}

export async function createPost(fd) {
  const s = await requireMember();
  if (s.role !== "member") redirect("/admin");
  const title = str(fd, "title", 150);
  const body = str(fd, "body", 5000);
  if (!title || !body) fail("/messages", "Subject and message are required.");
  await db.createPost({ id: id(), userId: s.user.id, title, body });
  await record(s, "message_sent", title);
  revalidatePath("/messages");
  redirect("/messages");
}

export async function adminReply(fd) {
  const { scope, session } = await requireAdmin();
  const postId = str(fd, "postId", 64);
  const body = str(fd, "body", 5000);
  if (!body) return;
  await db.addReply({ id: id(), postId, body, scope });
  await record(session, "message_reply", "Replied to a member message");
  revalidatePath("/admin", "layout");
}

export async function adminDeletePost(fd) {
  const { scope, session } = await requireAdmin();
  const postId = str(fd, "postId", 64);
  await db.deletePost(postId, scope);
  await record(session, "message_deleted", "Deleted a member conversation");
  revalidatePath("/admin", "layout");
}

export async function adminRemoveMember(fd) {
  const { scope, session } = await requireAdmin();
  const userId = str(fd, "userId", 64);
  const target = await db.findUserById(userId);
  await db.removeUser(userId, scope);
  await record(session, "member_removed", target?.email || userId);
  revalidatePath("/admin", "layout");
}

export async function adminSetTrackerName(fd) {
  const { scope, session } = await requireAdmin();
  const userId = str(fd, "userId", 64);
  const name = str(fd, "name", 200);
  const target = await db.findUserById(userId);
  await db.setTrackerName(userId, name || null, scope);
  await record(session, "link_changed", `${target?.email || userId} → ${name || "unlinked"}`);
  revalidatePath("/admin", "layout");
}

export async function postIdea(fd) {
  const s = await requireMember();
  if (s.role !== "manager") redirect("/ideas");
  const title = str(fd, "title", 150);
  const body = str(fd, "body", 5000);
  if (!title) fail("/ideas", "A title is required.");
  await db.createIdea({ id: id(), managerId: s.user.id, title, body, field: str(fd, "field", 100) || null });
  await record(s, "idea_posted", title);
  revalidatePath("/ideas");
  redirect("/ideas");
}

export async function removeIdea(fd) {
  const s = await requireMember();
  if (s.role !== "manager") redirect("/ideas");
  await db.deleteIdea(str(fd, "ideaId", 64), s.user.id);
  await record(s, "idea_deleted", "Deleted a research idea");
  revalidatePath("/ideas");
}

export async function respondToIdea(fd) {
  const s = await requireMember();
  if (s.role !== "member") redirect("/ideas");
  const stance = str(fd, "stance", 20);
  if (!["lead", "interested", "pass"].includes(stance)) return;
  await db.addIdeaResponse({ id: id(), ideaId: str(fd, "ideaId", 64), user: s.user, body: str(fd, "body", 3000), stance });
  await record(s, "opinion_saved", `Opinion: ${stance}`);
  revalidatePath("/ideas");
}

export async function removeMyOpinion(fd) {
  const s = await requireMember();
  if (s.role !== "member") redirect("/ideas");
  await db.removeIdeaResponse({ ideaId: str(fd, "ideaId", 64), userId: s.user.id });
  await record(s, "opinion_removed", "Withdrew an opinion");
  revalidatePath("/ideas");
}

export async function clearActivityLog() {
  const { scope, session } = await requireAdmin();
  await db.clearActivity(scope);
  await record(session, "log_cleared", "Activity log cleared");
  revalidatePath("/admin/activity");
}
