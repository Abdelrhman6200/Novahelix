import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listActivity, activityStats } from "@/lib/db";
import { clearActivityLog } from "../../actions";
import { Chip, Empty, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Activity log" };

const LEVELS = {
  admin: { label: "Administrator", tone: "red" },
  manager: { label: "Manager", tone: "blue" },
  member: { label: "Member", tone: "green" },
  unknown: { label: "Not signed in", tone: "gray" },
};
const EVENTS = {
  signin: "Signed in",
  signin_failed: "Failed sign-in",
  signout: "Signed out",
  register: "Registered",
  message_sent: "Sent a message",
  message_reply: "Replied to a message",
  message_deleted: "Deleted a conversation",
  member_removed: "Removed a member",
  link_changed: "Changed tracker link",
  idea_posted: "Posted an idea",
  idea_deleted: "Deleted an idea",
  opinion_saved: "Saved an opinion",
  log_cleared: "Cleared the log",
};

const ACCESS = [
  { level: "manager", can: "Everything for the members linked to them: all projects and progress with internal notes, every message, every idea opinion, the member list, tracker links and this log." },
  { level: "member", can: "Only their own data: the projects they lead or work on (no notes, no other people's names), their own messages with the manager, the research ideas, and their own opinions." },
  { level: "admin", can: "Full access to every member and all data. This is the optional environment-variable administrator, separate from manager accounts." },
];

export default async function Activity({ searchParams }) {
  const { scope } = await requireAdmin();
  const { level, event } = await searchParams;
  const lv = level in LEVELS ? level : null;
  const ev = event in EVENTS ? event : null;
  const [rows, stats] = await Promise.all([listActivity({ scope, level: lv, event: ev }), activityStats(scope)]);
  const n = (l, e) => stats.find((x) => x.level === l && x.event === e)?.n || 0;
  const failed = stats.filter((x) => x.event === "signin_failed").reduce((a, x) => a + x.n, 0);
  const href = (l, e) => `/admin/activity?${[l && `level=${l}`, e && `event=${e}`].filter(Boolean).join("&")}`;

  return (
    <>
      <PageHeader title="Activity log" subtitle="A record of sign-ins and actions, by access level. Only you can see this page.">
        <details className="confirm">
          <summary className="btn danger sm">Clear log</summary>
          <form action={clearActivityLog} className="inline">
            <span className="small">Permanently delete all recorded activity?</span>
            <button className="danger sm">Yes, clear</button>
          </form>
        </details>
      </PageHeader>

      <div className="stats">
        <Stat label="Manager sign-ins" value={n("manager", "signin") + n("admin", "signin")} hint="Last 7 days" />
        <Stat label="Member sign-ins" value={n("member", "signin")} hint="Last 7 days" />
        <Stat label="Failed sign-ins" value={failed} hint="Last 7 days" />
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Access levels</h2>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Level</th><th>What they can see and do</th></tr></thead>
            <tbody>
              {ACCESS.map((a) => (
                <tr key={a.level}>
                  <td><Chip tone={LEVELS[a.level].tone}>{LEVELS[a.level].label}</Chip></td>
                  <td>{a.can}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="inline" style={{ margin: "4px 0 6px" }} aria-label="Filter by access level">
        <Link href={href(null, ev)} className={`chip plain ${!lv ? "blue" : "gray"}`}>All levels</Link>
        {Object.entries(LEVELS).map(([k, v]) => (
          <Link key={k} href={href(k, ev)} className={`chip plain ${lv === k ? "blue" : "gray"}`}>{v.label}</Link>
        ))}
      </div>
      <div className="inline" style={{ margin: "0 0 16px" }} aria-label="Filter by event">
        <Link href={href(lv, null)} className={`chip plain ${!ev ? "blue" : "gray"}`}>All events</Link>
        {["signin", "signin_failed", "message_sent", "opinion_saved", "link_changed", "member_removed"].map((k) => (
          <Link key={k} href={href(lv, k)} className={`chip plain ${ev === k ? "blue" : "gray"}`}>{EVENTS[k]}</Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty title="Nothing recorded yet">Sign-ins and actions will appear here as they happen.</Empty>
      ) : (
        <div className="tablewrap">
          <table>
            <thead><tr><th>When</th><th>Access level</th><th>Who</th><th>Event</th><th>Detail</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(r.at).toLocaleString()}</td>
                  <td><Chip tone={LEVELS[r.level]?.tone || "gray"}>{LEVELS[r.level]?.label || r.level}</Chip></td>
                  <td>{r.actorEmail || <span className="mut">—</span>}</td>
                  <td>{EVENTS[r.event] || r.event}</td>
                  <td className="mut">{r.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mut small" style={{ marginTop: 10 }}>Showing the most recent {rows.length} entries. Passwords are never recorded.</p>
    </>
  );
}
