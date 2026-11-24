import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { listProjects } from "@/lib/db";
import { matchRole } from "@/lib/names";
import { Chip, Empty, PaceChip, PageHeader, ProgressChip, Stage, Stat } from "@/components/ui";

export const metadata = { title: "My projects" };

export default async function Dashboard() {
  const s = await requireMember();
  if (s.role !== "member") redirect("/admin");
  // Members only ever receive the projects they lead or work on.
  const mine = (await listProjects())
    .map((p) => ({ p, role: matchRole(p, s.user.trackerName) }))
    .filter((x) => x.role);
  const leading = mine.filter((x) => x.role === "Lead").length;
  const active = mine.filter((x) => x.p.progress === "In Progress" || x.p.progress === "Under Review").length;

  return (
    <>
      <PageHeader title={`Hello, ${s.user.name}`} subtitle="Your research projects and how they are progressing.">
        <Link className="btn ghost" href="/ideas">Browse research ideas</Link>
      </PageHeader>

      <div className="stats">
        <Stat label="Projects" value={mine.length} />
        <Stat label="Leading" value={leading} />
        <Stat label="Active" value={active} hint="In progress or under review" />
      </div>

      {mine.length === 0 ? (
        <Empty title="No projects linked to your account yet">
          Your manager links accounts to the research tracker. Message them if you expected to see a project here.
          <div className="sp" />
          <Link className="btn sm" href="/messages">Message your manager</Link>
        </Empty>
      ) : (
        <div className="grid g2">
          {mine.map(({ p, role }) => (
            <article className="card project" key={p.id} style={{ margin: 0 }}>
              <div className="row" style={{ alignItems: "flex-start" }}>
                <Chip tone={role === "Lead" ? "blue" : "gray"} plain>{role}</Chip>
                <div className="inline">
                  <ProgressChip value={p.progress} />
                  <PaceChip value={p.pace} />
                </div>
              </div>
              <h3 style={{ marginTop: 12 }}>{p.title}</h3>
              <Stage value={p.progress} />
              <div className="meta kv">
                <span>Type</span><b>{p.type || "—"}</b>
                <span>Target</span><b>{p.date || "—"}</b>
                <span>Team</span><b>{1 + p.researchers.length} {1 + p.researchers.length === 1 ? "person" : "people"}</b>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
