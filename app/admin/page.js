import { requireAdmin } from "@/lib/auth";
import { listUsers, listAllPosts, listProjects } from "@/lib/db";
import { matchRole } from "@/lib/names";
import { adminReply, adminDeletePost, adminRemoveMember, adminSetTrackerName } from "../actions";

export default async function Admin() {
  const { scope } = await requireAdmin();
  const [users, posts, projects] = await Promise.all([listUsers(scope), listAllPosts(scope), listProjects()]);
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  const names = [...new Set(projects.flatMap((p) => [p.lead, ...p.researchers]).filter(Boolean))].sort();
  const linked = users.filter((u) => u.trackerName).length;
  return (
    <>
      <h1>Admin console</h1>
      <p className="mut">
        {users.length} member{users.length === 1 ? "" : "s"} · {linked} linked to the tracker · {projects.length} project
        {projects.length === 1 ? "" : "s"} · {posts.length} discussion{posts.length === 1 ? "" : "s"}. Only you can see this page.
      </p>

      <div className="card">
        <h2>All members</h2>
        <p className="mut">
          Set a member's <strong>Tracker name</strong> to link their account to their projects. Start typing and pick the
          exact name from the research tracker.
        </p>
        {users.length === 0 ? (
          <p className="mut">No members yet.</p>
        ) : (
          <div className="tablewrap">
            <datalist id="names">{names.map((n) => <option key={n} value={n} />)}</datalist>
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Tracker name</th><th>Projects</th><th></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <form action={adminSetTrackerName} className="row" style={{ flexWrap: "nowrap" }}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input name="name" list="names" defaultValue={u.trackerName || ""} placeholder="Not linked" style={{ minWidth: 190 }} />
                        <button className="ghost">Save</button>
                      </form>
                    </td>
                    <td>{projects.filter((p) => matchRole(p, u.trackerName)).length}</td>
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

      <div className="card">
        <h2>Research progress</h2>
        {projects.length === 0 ? (
          <p className="mut">No tracker data imported yet.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr><th>Project</th><th>Type</th><th>Progress</th><th>Pace</th><th>Lead</th><th>Researchers</th><th>Accounts</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td>{p.type || "—"}</td>
                    <td>{p.progress || "—"}</td>
                    <td>{p.pace || "—"}</td>
                    <td>{p.lead || "—"}</td>
                    <td>{p.researchers.join(", ") || "—"}</td>
                    <td>{users.filter((u) => matchRole(p, u.trackerName)).map((u) => u.email).join(", ") || "—"}</td>
                    <td>{p.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2>All discussions</h2>
      {posts.length === 0 && <p className="mut">Nothing posted yet.</p>}
      {posts.map((p) => (
        <div className="card" key={p.id}>
          <div className="row">
            <strong>{p.title}</strong>
            <form action={adminDeletePost}>
              <input type="hidden" name="postId" value={p.id} />
              <button className="danger">Delete</button>
            </form>
          </div>
          <div className="mut">
            {byId[p.userId]?.name ?? "Unknown"} ({byId[p.userId]?.email}) · {new Date(p.createdAt).toLocaleString()}
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
