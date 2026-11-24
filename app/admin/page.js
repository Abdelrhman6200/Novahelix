import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listUsers, listAllPosts, listProjects } from "@/lib/db";
import { matchRole } from "@/lib/names";
import { Avatar, Chip, Empty, PageHeader, PROGRESS, Stat } from "@/components/ui";

export const metadata = { title: "Overview" };

export default async function Overview() {
  const { scope } = await requireAdmin();
  const [users, posts, projects] = await Promise.all([listUsers(scope), listAllPosts(scope), listProjects()]);
  const unlinked = users.filter((u) => !u.trackerName);
  const awaiting = posts.filter((p) => p.replies.length === 0);
  const counts = Object.keys(PROGRESS).map((k) => ({ k, n: projects.filter((p) => p.progress === k).length }));
  const slow = projects.filter((p) => p.pace === "Slow" && p.progress !== "Completed");

  return (
    <>
      <PageHeader title="Overview" subtitle="Everything across your members and research projects." />

      <div className="stats">
        <Stat label="Members" value={users.length} hint={`${users.length - unlinked.length} linked to the tracker`} />
        <Stat label="Projects" value={projects.length} hint={`${counts.find((c) => c.k === "In Progress")?.n || 0} in progress`} />
        <Stat label="Awaiting reply" value={awaiting.length} hint="Member messages with no reply" />
        <Stat label="Slow pace" value={slow.length} hint="Projects that may need a push" />
      </div>

      <div className="card">
        <div className="row"><h2>Research progress</h2><Link className="btn ghost sm" href="/admin/projects">View all projects</Link></div>
        {projects.length === 0 ? (
          <Empty title="No tracker data yet" />
        ) : (
          <>
            <div className="stack-bar" style={{ marginTop: 14 }} role="img" aria-label="Projects by progress stage">
              {counts.filter((c) => c.n).map((c) => (
                <i key={c.k} style={{ flex: c.n, background: PROGRESS[c.k].color }} title={`${c.k}: ${c.n}`} />
              ))}
            </div>
            <div className="legend">
              {counts.map((c) => (
                <span key={c.k}><span className="dot" style={{ background: PROGRESS[c.k].color }} />{c.k} <b>{c.n}</b></span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid g2">
        <div className="card" style={{ margin: 0 }}>
          <div className="row"><h2>Needs a reply</h2><Link className="btn ghost sm" href="/admin/discussions">Open</Link></div>
          {awaiting.length === 0 ? (
            <p className="mut">You're all caught up.</p>
          ) : (
            awaiting.slice(0, 5).map((p) => {
              const u = users.find((x) => x.id === p.userId);
              return (
                <div className="who" key={p.id} style={{ padding: "10px 0", borderTop: "1px solid var(--bd)" }}>
                  <Avatar name={u?.name} />
                  <div><b>{p.title}</b><span>{u?.name} · {new Date(p.createdAt).toLocaleDateString()}</span></div>
                </div>
              );
            })
          )}
        </div>
        <div className="card" style={{ margin: 0 }}>
          <div className="row"><h2>Accounts not linked</h2><Link className="btn ghost sm" href="/admin/members">Link</Link></div>
          {unlinked.length === 0 ? (
            <p className="mut">Every member is linked to the tracker.</p>
          ) : (
            <>
              <p className="mut small">These members can't see projects until you set their tracker name.</p>
              {unlinked.slice(0, 6).map((u) => (
                <div className="who" key={u.id} style={{ padding: "8px 0", borderTop: "1px solid var(--bd)" }}>
                  <Avatar name={u.name} />
                  <div><b>{u.name}</b><span>{u.email}</span></div>
                </div>
              ))}
              {unlinked.length > 6 && <p className="mut small">and {unlinked.length - 6} more</p>}
            </>
          )}
        </div>
      </div>
    </>
  );
}
