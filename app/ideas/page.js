import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { listIdeasForManager, listIdeasForMember } from "@/lib/db";
import { postIdea, removeIdea, respondToIdea } from "../actions";
import { Avatar, Chip, Empty, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Research ideas" };

const STANCES = {
  lead: { label: "I'd lead this", tone: "green" },
  interested: { label: "Interested", tone: "blue" },
  pass: { label: "Not for me", tone: "gray" },
};
const OTHER = "Other ideas";

export default async function Ideas({ searchParams }) {
  const s = await requireMember();
  if (s.role === "admin") redirect("/admin");
  const { error, field: sel } = await searchParams;
  const manager = s.role === "manager";
  const all = manager ? await listIdeasForManager(s.user.id) : await listIdeasForMember(s.user);

  const fieldOf = (i) => i.field || OTHER;
  const fields = [...new Set(all.map(fieldOf))];
  const shown = sel && fields.includes(sel) ? all.filter((i) => fieldOf(i) === sel) : all;
  const groups = [...new Set(shown.map(fieldOf))].map((f) => ({ f, items: shown.filter((i) => fieldOf(i) === f) }));

  const answered = all.filter((i) => i.responses.length).length;
  const tally = (i, k) => i.responses.filter((r) => r.stance === k).length;
  const totals = Object.fromEntries(Object.keys(STANCES).map((k) => [k, all.reduce((n, i) => n + tally(i, k), 0)]));

  return (
    <>
      <PageHeader
        title="Research ideas"
        subtitle={
          manager
            ? "Post research gaps for your team. Each member gives a private opinion and only you see every one."
            : "Research gaps shared by your manager. Tell them whether you'd lead one, are interested, or would pass. Only you and your manager see your opinion."
        }
      />

      <div className="stats">
        <Stat label="Ideas" value={all.length} hint={`${fields.length} field${fields.length === 1 ? "" : "s"}`} />
        {manager ? (
          <>
            <Stat label="Would lead" value={totals.lead} hint="Across all ideas" />
            <Stat label="Interested" value={totals.interested} />
            <Stat label="Not for me" value={totals.pass} />
          </>
        ) : (
          <Stat label="Your opinions" value={`${answered} / ${all.length}`} hint="Ideas you've responded to" />
        )}
      </div>

      {manager && (
        <details className="card">
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>+ Post a new idea</summary>
          {error && <p className="alert" role="alert" style={{ marginTop: 12 }}>{error}</p>}
          <form action={postIdea} className="stack" style={{ marginTop: 14 }}>
            <label>Title<input name="title" required maxLength={150} /></label>
            <label>
              Field <span className="mut" style={{ fontWeight: 400 }}>(optional)</span>
              <input name="field" list="fields" maxLength={100} placeholder="Pick an existing field or type a new one" />
              <datalist id="fields">{fields.filter((f) => f !== OTHER).map((f) => <option key={f} value={f} />)}</datalist>
            </label>
            <label>Description <span className="mut" style={{ fontWeight: 400 }}>(optional)</span><textarea name="body" rows={4} maxLength={5000} /></label>
            <div><button>Post idea</button></div>
          </form>
        </details>
      )}

      {all.length > 0 && (
        <div className="inline" style={{ margin: "4px 0 18px" }} aria-label="Filter by field">
          <Link href="/ideas" className={`chip plain ${!sel ? "blue" : "gray"}`}>All fields ({all.length})</Link>
          {fields.map((f) => (
            <Link key={f} href={`/ideas?field=${encodeURIComponent(f)}`} className={`chip plain ${sel === f ? "blue" : "gray"}`}>
              {f} ({all.filter((i) => fieldOf(i) === f).length})
            </Link>
          ))}
        </div>
      )}

      {all.length === 0 && (
        <Empty title={manager ? "No ideas posted yet" : "Nothing shared with you yet"}>
          {manager ? "Post your first research idea above." : "New ideas from your manager will appear here."}
        </Empty>
      )}

      {groups.map(({ f, items }) => (
        <section key={f}>
          <div className="section-title"><h2>{f}</h2><span className="mut small">{items.length} idea{items.length === 1 ? "" : "s"}</span></div>
          {items.map((i) => {
            const mine = manager ? null : i.responses[0];
            return (
              <div className="card" key={i.id} style={{ padding: 16 }}>
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div className="inline" style={{ marginBottom: 4 }}>
                      {i.best && <Chip tone="amber" plain>★ Best first</Chip>}
                    </div>
                    <strong style={{ fontSize: "1.02rem" }}>{i.title}</strong>
                    {i.body && <p className="pre mut" style={{ marginBottom: 0 }}>{i.body}</p>}
                  </div>
                  <div className="inline">
                    {manager
                      ? Object.entries(STANCES).map(([k, v]) => (
                          <Chip key={k} tone={tally(i, k) ? v.tone : "gray"} plain>{tally(i, k)} {v.label.toLowerCase()}</Chip>
                        ))
                      : mine
                        ? <Chip tone={STANCES[mine.stance]?.tone || "gray"}>{STANCES[mine.stance]?.label || "Responded"}</Chip>
                        : <Chip tone="amber">Your opinion needed</Chip>}
                  </div>
                </div>

                {manager ? (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--ac)" }}>
                      Opinions ({i.responses.length})
                    </summary>
                    {i.responses.length === 0 && <p className="mut small">No opinions yet.</p>}
                    {i.responses.map((r) => (
                      <div className="thread" key={r.id}>
                        <div className="by">
                          <Avatar name={r.name} /> <b>{r.name}</b> <span>{r.email}</span>
                          {r.stance && <Chip tone={STANCES[r.stance]?.tone} plain>{STANCES[r.stance]?.label}</Chip>}
                        </div>
                        {r.body && <div className="pre">{r.body}</div>}
                      </div>
                    ))}
                    <details className="confirm" style={{ marginTop: 10 }}>
                      <summary className="btn danger sm">Delete idea</summary>
                      <form action={removeIdea} className="inline">
                        <input type="hidden" name="ideaId" value={i.id} />
                        <span className="small">Delete this idea and all opinions?</span>
                        <button className="danger sm">Yes, delete</button>
                      </form>
                    </details>
                  </details>
                ) : (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--ac)" }}>
                      {mine ? "Edit your opinion" : "Give your opinion"}
                    </summary>
                    <form action={respondToIdea} className="stack" style={{ marginTop: 12 }}>
                      <input type="hidden" name="ideaId" value={i.id} />
                      <div className="inline" role="radiogroup" aria-label="Your stance">
                        {Object.entries(STANCES).map(([k, v]) => (
                          <label key={k} style={{ display: "inline-flex", gridAutoFlow: "column", alignItems: "center", gap: 6, fontWeight: 500 }}>
                            <input type="radio" name="stance" value={k} required defaultChecked={mine?.stance === k} style={{ width: "auto" }} />
                            {v.label}
                          </label>
                        ))}
                      </div>
                      <textarea name="body" rows={3} maxLength={3000} defaultValue={mine?.body || ""} placeholder="Optional: why, what angle you'd take, who could join…" aria-label="Comment" />
                      <div><button className="sm">Save opinion</button></div>
                    </form>
                  </details>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
