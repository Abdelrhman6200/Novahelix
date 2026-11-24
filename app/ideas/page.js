import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { listIdeasForManager, listIdeasForMember } from "@/lib/db";
import { postIdea, removeIdea, respondToIdea } from "../actions";

export const metadata = { title: "Research ideas · Nova Helix Research Hub" };

export default async function Ideas({ searchParams }) {
  const s = await requireMember();
  if (s.role === "admin") redirect("/admin");
  const { error } = await searchParams;
  const manager = s.role === "manager";
  const ideas = manager ? await listIdeasForManager(s.user.id) : await listIdeasForMember(s.user);

  return (
    <>
      <h1>Research ideas</h1>
      <p className="mut">
        {manager
          ? "Post a research idea. Linked members respond privately, and only you can see every response."
          : "Ideas shared by your manager. Your responses are visible only to you and your manager."}
      </p>

      {manager && (
        <div className="card">
          <h2>Post a new idea</h2>
          {error && <p className="alert">{error}</p>}
          <form action={postIdea} className="stack">
            <input name="title" placeholder="Idea title" required maxLength={150} />
            <textarea name="body" rows={5} placeholder="Describe the research idea, the question and what you need from the team" required maxLength={5000} />
            <button>Post idea</button>
          </form>
        </div>
      )}

      {ideas.length === 0 && <p className="mut">{manager ? "No ideas posted yet." : "No ideas have been shared with you yet."}</p>}

      {ideas.map((i) => (
        <div className="card" key={i.id}>
          <div className="row">
            <strong>{i.title}</strong>
            {manager && (
              <form action={removeIdea}>
                <input type="hidden" name="ideaId" value={i.id} />
                <button className="danger">Delete</button>
              </form>
            )}
          </div>
          <div className="mut">{new Date(i.createdAt).toLocaleString()}</div>
          <p style={{ whiteSpace: "pre-wrap" }}>{i.body}</p>

          {i.responses.length > 0 && <h3 style={{ margin: "12px 0 4px" }}>{manager ? `Responses (${i.responses.length})` : "Your response"}</h3>}
          {i.responses.map((r) => (
            <div className="reply" key={r.id}>
              {manager && (
                <div>
                  <span className="badge">{r.name}</span> <span className="mut">{r.email}</span>
                </div>
              )}
              <div style={{ whiteSpace: "pre-wrap" }}>{r.body}</div>
              <div className="mut">{new Date(r.createdAt).toLocaleString()}</div>
            </div>
          ))}

          {!manager && (
            <form action={respondToIdea} className="stack">
              <input type="hidden" name="ideaId" value={i.id} />
              <textarea name="body" rows={3} placeholder="Your response or suggestion…" required maxLength={5000} />
              <button>Send response</button>
            </form>
          )}
        </div>
      ))}
    </>
  );
}
