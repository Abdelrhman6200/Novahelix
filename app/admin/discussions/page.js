import { requireAdmin } from "@/lib/auth";
import { listUsers, listAllPosts } from "@/lib/db";
import { adminReply, adminDeletePost } from "../../actions";
import { Avatar, Chip, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Discussions" };

export default async function Discussions() {
  const { scope } = await requireAdmin();
  const [users, posts] = await Promise.all([listUsers(scope), listAllPosts(scope)]);
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  const awaiting = posts.filter((p) => !p.replies.length).length;
  return (
    <>
      <PageHeader title="Discussions" subtitle={`${posts.length} conversation${posts.length === 1 ? "" : "s"} · ${awaiting} awaiting your reply`} />
      {posts.length === 0 && <Empty title="No messages yet">Members' messages will appear here.</Empty>}
      {posts.map((p) => {
        const u = byId[p.userId];
        return (
          <div className="card" key={p.id}>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div className="who">
                <Avatar name={u?.name} size="lg" />
                <div><b>{p.title}</b><span>{u?.name} · {u?.email} · {new Date(p.createdAt).toLocaleString()}</span></div>
              </div>
              <div className="inline">
                {p.replies.length === 0 && <Chip tone="amber">Awaiting reply</Chip>}
                <details className="confirm">
                  <summary className="btn danger sm">Delete</summary>
                  <form action={adminDeletePost} className="inline">
                    <input type="hidden" name="postId" value={p.id} />
                    <span className="small">Delete this conversation?</span>
                    <button className="danger sm">Yes, delete</button>
                  </form>
                </details>
              </div>
            </div>
            <p className="pre">{p.body}</p>
            {p.replies.map((r) => (
              <div className="thread mine" key={r.id}>
                <div className="by"><b>You</b> · {new Date(r.createdAt).toLocaleString()}</div>
                <div className="pre">{r.body}</div>
              </div>
            ))}
            <form action={adminReply} className="stack" style={{ marginTop: 10 }}>
              <input type="hidden" name="postId" value={p.id} />
              <textarea name="body" rows={2} required maxLength={5000} placeholder="Write a reply…" aria-label="Reply" />
              <div><button className="sm">Send reply</button></div>
            </form>
          </div>
        );
      })}
    </>
  );
}
