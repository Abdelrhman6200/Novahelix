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
    sql`CREATE SCHEMA IF NOT EXISTS novahelix`,
    sql`CREATE TABLE IF NOT EXISTS novahelix.users (
      id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
      institution text NOT NULL DEFAULT '', password_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now())`,
    sql`CREATE TABLE IF NOT EXISTS novahelix.posts (
      id text PRIMARY KEY, user_id text NOT NULL REFERENCES novahelix.users(id) ON DELETE CASCADE,
      title text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
    sql`CREATE TABLE IF NOT EXISTS novahelix.replies (
      id text PRIMARY KEY, post_id text NOT NULL REFERENCES novahelix.posts(id) ON DELETE CASCADE,
      body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
    sql`ALTER TABLE novahelix.users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'`,
    sql`ALTER TABLE novahelix.users ADD COLUMN IF NOT EXISTS manager_id text REFERENCES novahelix.users(id) ON DELETE SET NULL`,
    sql`ALTER TABLE novahelix.users ADD COLUMN IF NOT EXISTS tracker_name text`,
    sql`CREATE TABLE IF NOT EXISTS novahelix.ideas (
      id text PRIMARY KEY, manager_id text NOT NULL REFERENCES novahelix.users(id) ON DELETE CASCADE,
      title text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
    sql`CREATE TABLE IF NOT EXISTS novahelix.idea_responses (
      id text PRIMARY KEY, idea_id text NOT NULL REFERENCES novahelix.ideas(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES novahelix.users(id) ON DELETE CASCADE,
      body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
    sql`CREATE TABLE IF NOT EXISTS novahelix.projects (
      id text PRIMARY KEY, name text NOT NULL, title text, type text, date text, progress text, pace text,
      lead text, researchers jsonb NOT NULL DEFAULT '[]', supervisor text, notes text, position int NOT NULL DEFAULT 0)`,
  ]).catch((e) => {
    _ready = null;
    throw e;
  });
  await _ready;
  return sql;
}

const iso = (d) => new Date(d).toISOString();
const toUser = (r) => r && { id: r.id, name: r.name, email: r.email, institution: r.institution, passwordHash: r.password_hash, createdAt: iso(r.created_at), role: r.role, managerId: r.manager_id, trackerName: r.tracker_name };

async function withReplies(sql, rows) {
  if (!rows.length) return [];
  const reps = await sql`SELECT id, post_id, body, created_at FROM novahelix.replies WHERE post_id = ANY(${rows.map((p) => p.id)}) ORDER BY created_at`;
  return rows.map((p) => ({
    id: p.id, userId: p.user_id, title: p.title, body: p.body, createdAt: iso(p.created_at),
    replies: reps.filter((r) => r.post_id === p.id).map((r) => ({ id: r.id, body: r.body, createdAt: iso(r.created_at) })),
  }));
}

export async function findUserByEmail(email) {
  const sql = await db();
  return toUser((await sql`SELECT * FROM novahelix.users WHERE email = ${email}`)[0]);
}
export async function findUserById(id) {
  const sql = await db();
  return toUser((await sql`SELECT * FROM novahelix.users WHERE id = ${id}`)[0]);
}
// Returns the new user, or null if the email already exists.
// New members are linked to the (first) manager unless managerId is given.
export async function createUser({ id, name, email, institution, passwordHash, role = "member", managerId = null }) {
  const sql = await db();
  const rows = await sql`INSERT INTO novahelix.users (id, name, email, institution, password_hash, role, manager_id)
    VALUES (${id}, ${name}, ${email}, ${institution}, ${passwordHash}, ${role},
      CASE WHEN ${role}::text = 'member'
        THEN COALESCE(${managerId}::text, (SELECT m.id FROM novahelix.users m WHERE m.role = 'manager' ORDER BY m.created_at LIMIT 1))
        ELSE NULL END)
    ON CONFLICT (email) DO NOTHING RETURNING *`;
  return toUser(rows[0]) ?? null;
}
export async function setRoleAndManager(email, role, managerId) {
  const sql = await db();
  await sql`UPDATE novahelix.users SET role = ${role}, manager_id = ${managerId}::text WHERE email = ${email}`;
}
// scope = manager's user id, or null for the full-access admin.
export async function listUsers(scope = null) {
  const sql = await db();
  const rows = await sql`SELECT u.*, (SELECT count(*)::int FROM novahelix.posts p WHERE p.user_id = u.id) AS post_count
    FROM novahelix.users u WHERE (${scope}::text IS NULL OR u.manager_id = ${scope}::text) ORDER BY u.created_at`;
  return rows.map((r) => ({ ...toUser(r), postCount: r.post_count }));
}
export async function listPostsForUser(userId) {
  const sql = await db();
  return withReplies(sql, await sql`SELECT * FROM novahelix.posts WHERE user_id = ${userId} ORDER BY created_at DESC`);
}
export async function listAllPosts(scope = null) {
  const sql = await db();
  return withReplies(sql, await sql`SELECT p.* FROM novahelix.posts p JOIN novahelix.users u ON u.id = p.user_id
    WHERE (${scope}::text IS NULL OR u.manager_id = ${scope}::text) ORDER BY p.created_at DESC`);
}
export async function createPost({ id, userId, title, body }) {
  const sql = await db();
  await sql`INSERT INTO novahelix.posts (id, user_id, title, body) VALUES (${id}, ${userId}, ${title}, ${body})`;
}
export async function addReply({ id, postId, body, scope = null }) {
  const sql = await db();
  await sql`INSERT INTO novahelix.replies (id, post_id, body)
    SELECT ${id}, ${postId}, ${body} WHERE EXISTS (
      SELECT 1 FROM novahelix.posts p JOIN novahelix.users u ON u.id = p.user_id
      WHERE p.id = ${postId} AND (${scope}::text IS NULL OR u.manager_id = ${scope}::text))`;
}
export async function deletePost(id, scope = null) {
  const sql = await db();
  await sql`DELETE FROM novahelix.posts WHERE id = ${id}
    AND user_id IN (SELECT u.id FROM novahelix.users u WHERE ${scope}::text IS NULL OR u.manager_id = ${scope}::text)`;
}
export async function removeUser(id, scope = null) {
  const sql = await db();
  await sql`DELETE FROM novahelix.users WHERE id = ${id} AND role = 'member'
    AND (${scope}::text IS NULL OR manager_id = ${scope}::text)`;
}

const toProject = (r) => ({ id: r.id, name: r.name, title: r.title, type: r.type, date: r.date, progress: r.progress, pace: r.pace, lead: r.lead, researchers: r.researchers || [], supervisor: r.supervisor, notes: r.notes });
export async function listProjects() {
  const sql = await db();
  return (await sql`SELECT * FROM novahelix.projects ORDER BY position`).map(toProject);
}
// Replaces the whole tracker (used when importing the spreadsheet).
export async function replaceProjects(list) {
  const sql = await db();
  await sql.transaction([
    sql`DELETE FROM novahelix.projects`,
    ...list.map((p, i) => sql`INSERT INTO novahelix.projects (id, name, title, type, date, progress, pace, lead, researchers, supervisor, notes, position)
      VALUES (${"p" + i}, ${p.name}, ${p.title}, ${p.type}, ${p.date}, ${p.progress}, ${p.pace}, ${p.lead},
        ${JSON.stringify(p.researchers || [])}::jsonb, ${p.supervisor}, ${p.notes}, ${i})`),
  ]);
}
export async function setTrackerName(userId, name, scope = null) {
  const sql = await db();
  await sql`UPDATE novahelix.users SET tracker_name = ${name}::text
    WHERE id = ${userId} AND role = 'member' AND (${scope}::text IS NULL OR manager_id = ${scope}::text)`;
}
export async function setTrackerNameByEmail(email, name) {
  const sql = await db();
  await sql`UPDATE novahelix.users SET tracker_name = ${name}::text WHERE email = ${email}`;
}

// ---- Research ideas: a manager posts, linked members respond privately ----
export async function createIdea({ id, managerId, title, body }) {
  const sql = await db();
  await sql`INSERT INTO novahelix.ideas (id, manager_id, title, body) VALUES (${id}, ${managerId}, ${title}, ${body})`;
}
export async function deleteIdea(id, managerId) {
  const sql = await db();
  await sql`DELETE FROM novahelix.ideas WHERE id = ${id} AND manager_id = ${managerId}`;
}
async function withResponses(sql, ideas, userId = null) {
  if (!ideas.length) return [];
  const rows = await sql`SELECT r.id, r.idea_id, r.body, r.created_at, r.user_id, u.name, u.email
    FROM novahelix.idea_responses r JOIN novahelix.users u ON u.id = r.user_id
    WHERE r.idea_id = ANY(${ideas.map((i) => i.id)}) AND (${userId}::text IS NULL OR r.user_id = ${userId}::text)
    ORDER BY r.created_at`;
  return ideas.map((i) => ({
    id: i.id, title: i.title, body: i.body, createdAt: iso(i.created_at),
    responses: rows.filter((r) => r.idea_id === i.id).map((r) => ({ id: r.id, body: r.body, createdAt: iso(r.created_at), name: r.name, email: r.email })),
  }));
}
// Manager: own ideas with ALL responses.
export async function listIdeasForManager(managerId) {
  const sql = await db();
  return withResponses(sql, await sql`SELECT * FROM novahelix.ideas WHERE manager_id = ${managerId} ORDER BY created_at DESC`);
}
// Member: ideas from their manager, with only THEIR OWN responses.
export async function listIdeasForMember(user) {
  if (!user.managerId) return [];
  const sql = await db();
  return withResponses(sql, await sql`SELECT * FROM novahelix.ideas WHERE manager_id = ${user.managerId} ORDER BY created_at DESC`, user.id);
}
export async function addIdeaResponse({ id, ideaId, user, body }) {
  if (!user.managerId) return;
  const sql = await db();
  await sql`INSERT INTO novahelix.idea_responses (id, idea_id, user_id, body)
    SELECT ${id}, ${ideaId}, ${user.id}, ${body}
    WHERE EXISTS (SELECT 1 FROM novahelix.ideas WHERE id = ${ideaId} AND manager_id = ${user.managerId})`;
}
