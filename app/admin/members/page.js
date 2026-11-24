import { requireAdmin } from "@/lib/auth";
import { listUsers, listProjects } from "@/lib/db";
import { matchRole } from "@/lib/names";
import { adminSetTrackerName, adminRemoveMember } from "../../actions";
import { Avatar, Chip, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Members" };

export default async function Members() {
  const { scope } = await requireAdmin();
  const [users, projects] = await Promise.all([listUsers(scope), listProjects()]);
  const names = [...new Set(projects.flatMap((p) => [p.lead, ...p.researchers]).filter(Boolean))].sort();
  return (
    <>
      <PageHeader
        title="Members"
        subtitle="Link each account to a name in the research tracker so members see their own projects."
      />
      {users.length === 0 ? (
        <Empty title="No members yet" />
      ) : (
        <div className="tablewrap">
          <datalist id="names">{names.map((n) => <option key={n} value={n} />)}</datalist>
          <table>
            <thead>
              <tr><th>Member</th><th>Tracker name</th><th>Status</th><th>Projects</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const n = projects.filter((p) => matchRole(p, u.trackerName)).length;
                return (
                  <tr key={u.id}>
                    <td><div className="who"><Avatar name={u.name} /><div><b>{u.name}</b><span>{u.email}</span></div></div></td>
                    <td>
                      <form action={adminSetTrackerName} className="inline" style={{ flexWrap: "nowrap" }}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input name="name" list="names" defaultValue={u.trackerName || ""} placeholder="Type to search the tracker…" style={{ minWidth: 220 }} aria-label={`Tracker name for ${u.name}`} />
                        <button className="ghost sm">Save</button>
                      </form>
                    </td>
                    <td>{u.trackerName ? (n ? <Chip tone="green">Linked</Chip> : <Chip tone="blue">Linked · no projects yet</Chip>) : <Chip>Not linked</Chip>}</td>
                    <td>{n}</td>
                    <td>
                      <details className="confirm">
                        <summary className="btn danger sm">Remove</summary>
                        <form action={adminRemoveMember} className="inline">
                          <input type="hidden" name="userId" value={u.id} />
                          <span className="small">Delete account and messages?</span>
                          <button className="danger sm">Yes, remove</button>
                        </form>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
