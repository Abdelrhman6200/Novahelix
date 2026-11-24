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
  requireAdmin,
  requireMember,
} from "@/lib/auth";

const str = (fd, k, max) => String(fd.get(k) ?? "").trim().slice(0, max);
const fail = (path, msg) => redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
const id = () => crypto.randomUUID();

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
  redirect("/dashboard");
}

export async function login(fd) {
  const email = str(fd, "email", 200).toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (isAdminLogin(email, password)) {
    await startSession({ uid: "admin", role: "admin" });
    redirect("/admin");
  }
  const user = await db.findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) fail("/login", "Invalid email or password.");
  await startSession({ uid: user.id, role: "member" });
  redirect(user.role === "manager" ? "/admin" : "/dashboard");
}

export async function adminLogin(fd) {
  const email = str(fd, "email", 200).toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (isAdminLogin(email, password)) {
    await startSession({ uid: "admin", role: "admin" });
    redirect("/admin");
  }
  const user = await db.findUserByEmail(email);
  if (!user || user.role !== "manager" || !verifyPassword(password, user.passwordHash)) {
    fail("/login?as=admin", "Invalid administrator credentials.");
  }
  await startSession({ uid: user.id, role: "member" });
  redirect("/admin");
}

export async function logout() {
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
  revalidatePath("/messages");
  redirect("/messages");
}

export async function adminReply(fd) {
  const { scope } = await requireAdmin();
  const postId = str(fd, "postId", 64);
  const body = str(fd, "body", 5000);
  if (!body) return;
  await db.addReply({ id: id(), postId, body, scope });
  revalidatePath("/admin", "layout");
}

export async function adminDeletePost(fd) {
  const { scope } = await requireAdmin();
  const postId = str(fd, "postId", 64);
  await db.deletePost(postId, scope);
  revalidatePath("/admin", "layout");
}

export async function adminRemoveMember(fd) {
  const { scope } = await requireAdmin();
  const userId = str(fd, "userId", 64);
  await db.removeUser(userId, scope);
  revalidatePath("/admin", "layout");
}

export async function adminSetTrackerName(fd) {
  const { scope } = await requireAdmin();
  const userId = str(fd, "userId", 64);
  const name = str(fd, "name", 200);
  await db.setTrackerName(userId, name || null, scope);
  revalidatePath("/admin", "layout");
}

export async function postIdea(fd) {
  const s = await requireMember();
  if (s.role !== "manager") redirect("/ideas");
  const title = str(fd, "title", 150);
  const body = str(fd, "body", 5000);
  if (!title) fail("/ideas", "A title is required.");
  await db.createIdea({ id: id(), managerId: s.user.id, title, body, field: str(fd, "field", 100) || null });
  revalidatePath("/ideas");
  redirect("/ideas");
}

export async function removeIdea(fd) {
  const s = await requireMember();
  if (s.role !== "manager") redirect("/ideas");
  await db.deleteIdea(str(fd, "ideaId", 64), s.user.id);
  revalidatePath("/ideas");
}

export async function respondToIdea(fd) {
  const s = await requireMember();
  if (s.role !== "member") redirect("/ideas");
  const stance = str(fd, "stance", 20);
  if (!["lead", "interested", "pass"].includes(stance)) return;
  await db.addIdeaResponse({ id: id(), ideaId: str(fd, "ideaId", 64), user: s.user, body: str(fd, "body", 3000), stance });
  revalidatePath("/ideas");
}
