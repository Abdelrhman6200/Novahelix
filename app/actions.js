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
  redirect("/dashboard");
}

export async function adminLogin(fd) {
  const email = str(fd, "email", 200).toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!isAdminLogin(email, password)) fail("/login?as=admin", "Invalid administrator credentials.");
  await startSession({ uid: "admin", role: "admin" });
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
  if (!title || !body) fail("/dashboard", "Title and message are required.");
  await db.createPost({ id: id(), userId: s.user.id, title, body });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function adminReply(fd) {
  await requireAdmin();
  const postId = str(fd, "postId", 64);
  const body = str(fd, "body", 5000);
  if (!body) return;
  await db.addReply({ id: id(), postId, body });
  revalidatePath("/admin");
}

export async function adminDeletePost(fd) {
  await requireAdmin();
  const postId = str(fd, "postId", 64);
  await db.deletePost(postId);
  revalidatePath("/admin");
}

export async function adminRemoveMember(fd) {
  await requireAdmin();
  const userId = str(fd, "userId", 64);
  await db.removeUser(userId);
  revalidatePath("/admin");
}
