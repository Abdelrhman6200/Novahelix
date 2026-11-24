import { neon } from "@neondatabase/serverless";

let _sql = null;
let _ready = null;

// Lazy so `next build` never needs DATABASE_URL.
function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  return _sql;
}

async function db() {
  const sql = getSql();
  _ready ??= sql.transaction([
    sql`CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
      institution text NOT NULL DEFAULT '', password_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now())`,
    sql`CREATE TABLE IF NOT EXISTS posts (
      id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
    sql`CREATE TABLE IF NOT EXISTS replies (
      id text PRIMARY KEY, post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id text REFERENCES users(id) ON DELETE SET NULL`,
  ]).catch((e) => {
    _ready = null;
    throw e;
  });
  await _ready;
  return sql;
}

const iso = (d) => new Date(d).toISOString();
const toUser = (r) => r && { id: r.id, name: r.name, email: r.email, institution: r.institution, passwordHash: r.password_hash, createdAt: iso(r.created_at), role: r.role, managerId: r.manager_id };

async function withReplies(sql, rows) {
  if (!rows.length) return [];
  const reps = await sql`SELECT id, post_id, body, created_at FROM replies WHERE post_id = ANY(${rows.map((p) => p.id)}) ORDER BY created_at`;
  return rows.map((p) => ({
    id: p.id, userId: p.user_id, title: p.title, body: p.body, createdAt: iso(p.created_at),
    replies: reps.filter((r) => r.post_id === p.id).map((r) => ({ id: r.id, body: r.body, createdAt: iso(r.created_at) })),
  }));
}

export async function findUserByEmail(email) {
  const sql = await db();
  return toUser((await sql`SELECT * FROM users WHERE email = ${email}`)[0]);
}
export async function findUserById(id) {
  const sql = await db();
  return toUser((await sql`SELECT * FROM users WHERE id = ${id}`)[0]);
}
// Returns the new user, or null if the email already exists.
// New members are linked to the (first) manager unless managerId is given.
export async function createUser({ id, name, email, institution, passwordHash, role = "member", managerId = null }) {
  const sql = await db();
  const rows = await sql`INSERT INTO users (id, name, email, institution, password_hash, role, manager_id)
    VALUES (${id}, ${name}, ${email}, ${institution}, ${passwordHash}, ${role},
      CASE WHEN ${role}::text = 'member'
        THEN COALESCE(${managerId}::text, (SELECT m.id FROM users m WHERE m.role = 'manager' ORDER BY m.created_at LIMIT 1))
        ELSE NULL END)
    ON CONFLICT (email) DO NOTHING RETURNING *`;
  return toUser(rows[0]) ?? null;
}
export async function setRoleAndManager(email, role, managerId) {
  const sql = await db();
  await sql`UPDATE users SET role = ${role}, manager_id = ${managerId}::text WHERE email = ${email}`;
}
// scope = manager's user id, or null for the full-access admin.
export async function listUsers(scope = null) {
  const sql = await db();
  const rows = await sql`SELECT u.*, (SELECT count(*)::int FROM posts p WHERE p.user_id = u.id) AS post_count
    FROM users u WHERE (${scope}::text IS NULL OR u.manager_id = ${scope}::text) ORDER BY u.created_at`;
  return rows.map((r) => ({ ...toUser(r), postCount: r.post_count }));
}
export async function listPostsForUser(userId) {
  const sql = await db();
  return withReplies(sql, await sql`SELECT * FROM posts WHERE user_id = ${userId} ORDER BY created_at DESC`);
}
export async function listAllPosts(scope = null) {
  const sql = await db();
  return withReplies(sql, await sql`SELECT p.* FROM posts p JOIN users u ON u.id = p.user_id
    WHERE (${scope}::text IS NULL OR u.manager_id = ${scope}::text) ORDER BY p.created_at DESC`);
}
export async function createPost({ id, userId, title, body }) {
  const sql = await db();
  await sql`INSERT INTO posts (id, user_id, title, body) VALUES (${id}, ${userId}, ${title}, ${body})`;
}
export async function addReply({ id, postId, body, scope = null }) {
  const sql = await db();
  await sql`INSERT INTO replies (id, post_id, body)
    SELECT ${id}, ${postId}, ${body} WHERE EXISTS (
      SELECT 1 FROM posts p JOIN users u ON u.id = p.user_id
      WHERE p.id = ${postId} AND (${scope}::text IS NULL OR u.manager_id = ${scope}::text))`;
}
export async function deletePost(id, scope = null) {
  const sql = await db();
  await sql`DELETE FROM posts WHERE id = ${id}
    AND user_id IN (SELECT u.id FROM users u WHERE ${scope}::text IS NULL OR u.manager_id = ${scope}::text)`;
}
export async function removeUser(id, scope = null) {
  const sql = await db();
  await sql`DELETE FROM users WHERE id = ${id} AND role = 'member'
    AND (${scope}::text IS NULL OR manager_id = ${scope}::text)`;
}
