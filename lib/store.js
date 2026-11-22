import fs from "node:fs";
import path from "node:path";

const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const file = path.join(dir, "db.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { users: [], posts: [] };
  }
}

function save(db) {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, file);
}

export function read() {
  return load();
}

// Synchronous read-modify-write: safe for a single Node process.
export function mutate(fn) {
  const db = load();
  const result = fn(db);
  save(db);
  return result;
}
