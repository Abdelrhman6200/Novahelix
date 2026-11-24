import { requireAdmin } from "@/lib/auth";
import { listUsers, listProjects } from "@/lib/db";
import { matchRole } from "@/lib/names";
import { Empty, PaceChip, PageHeader, ProgressChip, Stage } from "@/components/ui";

export const metadata = { title: "Research progress" };

export default async function Projects() {
  const { scope } = await requireAdmin();
  const [users, projects] = await Promise.all([listUsers(scope), listProjects()]);
  return (
    <>
      <PageHeader title="Research progress" subtitle={`${projects.length} project${projects.length === 1 ? "" : "s"} from the Nova Helix research tracker.`} />
      {projects.length === 0 && <Empty title="No tracker data imported yet" />}
      <div className="grid g2">
        {projects.map((p) => {
          const accounts = users.filter((u) => matchRole(p, u.trackerName));
          return (
            <article className="card project" key={p.id} style={{ margin: 0 }}>
              <div className="row">
                <span className="mut small">{[p.type, p.date].filter(Boolean).join(" · ") || "—"}</span>
                <div className="inline"><ProgressChip value={p.progress} /><PaceChip value={p.pace} /></div>
              </div>
              <h3 style={{ marginTop: 10 }}>{p.title}</h3>
              <Stage value={p.progress} />
              <div className="meta kv">
                <span>Lead</span><b>{p.lead || "—"}</b>
                <span>Researchers</span><b>{p.researchers.join(", ") || "—"}</b>
                <span>Supervisor</span><b>{p.supervisor || "—"}</b>
                <span>Accounts</span><b>{accounts.map((u) => u.email).join(", ") || <span className="mut">None linked</span>}</b>
              </div>
              {p.notes && <p className="note" style={{ marginTop: 12 }}><b>Note:</b> {p.notes}</p>}
            </article>
          );
        })}
      </div>
    </>
  );
}
