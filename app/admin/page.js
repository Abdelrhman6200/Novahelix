import { requireAdmin } from "@/lib/auth";
import { read } from "@/lib/store";
import { adminReply, adminDeletePost, adminRemoveMember } from "../actions";

export default async function Admin() {
  await requireAdmin();
  const { users, posts } = read();
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  const sorted = [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <h1>Admin console</h1>
      <p className="mut">
        {users.length} member{users.length === 1 ? "" : "s"} · {posts.length} discussion
        {posts.length === 1 ? "" : "s"}. Only you can see this page.
      </p>

      <div className="card">
        <h2>All members</h2>
        {users.length === 0 ? (
          <p className="mut">No members yet.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Institution</th><th>Joined</th><th>Posts</th><th></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.institution || "—"}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>{posts.filter((p) => p.userId === u.id).length}</td>
                    <td>
                      <form action={adminRemoveMember}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button className="danger">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2>All discussions</h2>
      {sorted.length === 0 && <p className="mut">Nothing posted yet.</p>}
      {sorted.map((p) => (
        <div className="card" key={p.id}>
          <div className="row">
            <strong>{p.title}</strong>
            <form action={adminDeletePost}>
              <input type="hidden" name="postId" value={p.id} />
              <button className="danger">Delete</button>
            </form>
          </div>
          <div className="mut">
            {byId[p.userId]?.name ?? "Unknown"} ({byId[p.userId]?.email}) ·{" "}
            {new Date(p.createdAt).toLocaleString()}
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{p.body}</p>
          {p.replies.map((r) => (
            <div className="reply" key={r.id}>
              <span className="badge">You</span>
              <div style={{ whiteSpace: "pre-wrap" }}>{r.body}</div>
            </div>
          ))}
          <form action={adminReply} className="stack">
            <input type="hidden" name="postId" value={p.id} />
            <textarea name="body" rows={2} placeholder="Reply…" required maxLength={5000} />
            <button>Reply</button>
          </form>
        </div>
      ))}
    </>
  );
}
