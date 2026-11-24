import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { listPostsForUser } from "@/lib/db";
import { createPost } from "../actions";
import { Avatar, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Messages" };

export default async function Messages({ searchParams }) {
  const s = await requireMember();
  if (s.role !== "member") redirect("/admin/discussions");
  const { error } = await searchParams;
  const posts = await listPostsForUser(s.user.id);
  return (
    <>
      <PageHeader title="Messages" subtitle="Ask your manager a question or share an update. Only the two of you can see this." />

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>New message</h2>
        {error && <p className="alert" role="alert">{error}</p>}
        <form action={createPost} className="stack">
          <label>Subject<input name="title" required maxLength={150} /></label>
          <label>Message<textarea name="body" rows={4} required maxLength={5000} /></label>
          <div><button>Send message</button></div>
        </form>
      </div>

      <div className="section-title"><h2>Your conversations</h2></div>
      {posts.length === 0 && <Empty title="No messages yet">Start a conversation above.</Empty>}
      {posts.map((p) => (
        <div className="card" key={p.id}>
          <div className="row">
            <strong>{p.title}</strong>
            <span className="mut small">{new Date(p.createdAt).toLocaleString()}</span>
          </div>
          <p className="pre">{p.body}</p>
          {p.replies.map((r) => (
            <div className="thread" key={r.id}>
              <div className="by"><Avatar name="Manager" /> <b>Manager</b> · {new Date(r.createdAt).toLocaleString()}</div>
              <div className="pre">{r.body}</div>
            </div>
          ))}
          {p.replies.length === 0 && <span className="chip amber">Waiting for a reply</span>}
        </div>
      ))}
    </>
  );
}
