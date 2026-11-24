import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { listPostsForUser } from "@/lib/db";
import { createPost } from "../actions";

export default async function Dashboard({ searchParams }) {
  const s = await requireMember();
  if (s.role !== "member") redirect("/admin");
  const { error } = await searchParams;
  // Members only ever receive their own posts.
  const posts = await listPostsForUser(s.user.id);
  return (
    <>
      <h1>Hello, {s.user.name}</h1>
      <p className="mut">Only you and the administrator can see what you post here.</p>
      <div className="card">
        <h2>New discussion</h2>
        {error && <p className="err">{error}</p>}
        <form action={createPost} className="stack">
          <input name="title" placeholder="Title" required maxLength={150} />
          <textarea name="body" rows={5} placeholder="Your question or update" required maxLength={5000} />
          <button>Post</button>
        </form>
      </div>
      <h2>Your discussions</h2>
      {posts.length === 0 && <p className="mut">Nothing yet.</p>}
      {posts.map((p) => (
        <div className="card" key={p.id}>
          <strong>{p.title}</strong>
          <div className="mut">{new Date(p.createdAt).toLocaleString()}</div>
          <p style={{ whiteSpace: "pre-wrap" }}>{p.body}</p>
          {p.replies.map((r) => (
            <div className="reply" key={r.id}>
              <span className="badge">Admin</span>
              <div style={{ whiteSpace: "pre-wrap" }}>{r.body}</div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
