import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { listIdeasForManager, listIdeasForMember } from "@/lib/db";
import { postIdea, removeIdea, respondToIdea } from "../actions";
import { Avatar, Chip, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Research ideas" };

export default async function Ideas({ searchParams }) {
  const s = await requireMember();
  if (s.role === "admin") redirect("/admin");
  const { error } = await searchParams;
  const manager = s.role === "manager";
  const ideas = manager ? await listIdeasForManager(s.user.id) : await listIdeasForMember(s.user);

  return (
    <>
      <PageHeader
        title="Research ideas"
        subtitle={
          manager
            ? "Post an idea for your team. Members respond privately and only you see every response."
            : "Ideas shared by your manager. Your responses are visible only to you and your manager."
        }
      />

      {manager && (
        <div className="card">
          <h2 style={{ marginBottom: 12 }}>Post a new idea</h2>
          {error && <p className="alert" role="alert">{error}</p>}
          <form action={postIdea} className="stack">
            <label>Title<input name="title" required maxLength={150} placeholder="e.g. Gut microbiome and immune aging" /></label>
            <label>Description<textarea name="body" rows={5} required maxLength={5000} placeholder="The research question, why it matters and what you need from the team" /></label>
            <div><button>Post idea</button></div>
          </form>
        </div>
      )}

      {ideas.length === 0 && (
        <Empty title={manager ? "No ideas posted yet" : "Nothing shared with you yet"}>
          {manager ? "Post your first research idea above." : "New ideas from your manager will appear here."}
        </Empty>
      )}

      {ideas.map((i) => (
        <div className="card" key={i.id}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <div>
              <h2>{i.title}</h2>
              <span className="mut small">{new Date(i.createdAt).toLocaleString()}</span>
            </div>
            <div className="inline">
              {manager && <Chip tone={i.responses.length ? "green" : "gray"}>{i.responses.length} response{i.responses.length === 1 ? "" : "s"}</Chip>}
              {manager && (
                <details className="confirm">
                  <summary className="btn danger sm">Delete</summary>
                  <form action={removeIdea} className="inline">
                    <input type="hidden" name="ideaId" value={i.id} />
                    <span className="small">Delete this idea and its responses?</span>
                    <button className="danger sm">Yes, delete</button>
                  </form>
                </details>
              )}
            </div>
          </div>
          <p className="pre">{i.body}</p>

          {i.responses.map((r) => (
            <div className={manager ? "thread" : "thread mine"} key={r.id}>
              <div className="by">
                <Avatar name={manager ? r.name : s.user.name} />
                <b>{manager ? r.name : "Your response"}</b>
                {manager && <span>{r.email}</span>}
                <span>· {new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <div className="pre">{r.body}</div>
            </div>
          ))}

          {!manager && (
            <form action={respondToIdea} className="stack" style={{ marginTop: 12 }}>
              <input type="hidden" name="ideaId" value={i.id} />
              <label>
                {i.responses.length ? "Add another response" : "Your response"}
                <textarea name="body" rows={3} required maxLength={5000} placeholder="Share your thoughts, interest or suggestions…" />
              </label>
              <div><button className="sm">Send response</button></div>
            </form>
          )}
        </div>
      ))}
    </>
  );
}
