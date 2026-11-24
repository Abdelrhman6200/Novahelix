import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { listPostsForUser, listProjects } from "@/lib/db";
import { matchRole } from "@/lib/names";
import { createPost } from "../actions";

export default async function Dashboard({ searchParams }) {
  const s = await requireMember();
  if (s.role !== "member") redirect("/admin");
  const { error } = await searchParams;
  // Members only ever receive their own projects and posts.
  const [posts, all] = await Promise.all([listPostsForUser(s.user.id), listProjects()]);
  const mine = all
    .map((p) => ({ p, role: matchRole(p, s.user.trackerName) }))
    .filter((x) => x.role);
  return (
    <>
      <h1>Hello, {s.user.name}</h1>
      <p className="mut">Only you and your manager can see what is shown here.</p>

      <h2>Your research projects</h2>
      {mine.length === 0 && (
        <p className="mut">
          No projects are linked to your account yet. Your manager links accounts to the research tracker.
        </p>
      )}
      {mine.map(({ p, role }) => (
        <div className="card" key={p.id}>
          <div className="row">
            <strong>{p.title}</strong>
            <span className="badge">{role}</span>
          </div>
          <div className="mut">
            {[p.type, p.date && `Target ${p.date}`].filter(Boolean).join(" · ")}
          </div>
          <p>
            <strong>Progress:</strong> {p.progress || "—"} &nbsp; <strong>Pace:</strong> {p.pace || "—"}
            <br />
            <strong>Team size:</strong> {1 + p.researchers.length}
          </p>
        </div>
      ))}

      <h2>Message your manager</h2>
      <div className="card">
        {error && <p className="alert">{error}</p>}
        <form action={createPost} className="stack">
          <input name="title" placeholder="Title" required maxLength={150} />
          <textarea name="body" rows={4} placeholder="Your question or update" required maxLength={5000} />
          <button>Post</button>
        </form>
      </div>
      {posts.map((p) => (
        <div className="card" key={p.id}>
          <strong>{p.title}</strong>
          <div className="mut">{new Date(p.createdAt).toLocaleString()}</div>
          <p style={{ whiteSpace: "pre-wrap" }}>{p.body}</p>
          {p.replies.map((r) => (
            <div className="reply" key={r.id}>
              <span className="badge">Manager</span>
              <div style={{ whiteSpace: "pre-wrap" }}>{r.body}</div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
