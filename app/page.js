import Link from "next/link";
import { getSession } from "@/lib/auth";

export default async function Overview() {
  const s = await getSession();
  return (
    <>
      <h1 id="overview">Nova Helix Research Hub</h1>
      <p className="mut">A private space for research collaboration and discussion.</p>
      <div className="card">
        <h2>Overview</h2>
        <p>
          Nova Helix Research Hub brings researchers together to share questions, ideas and
          findings. Members join with their own account and take part in the discussion board.
        </p>
      </div>
      <div className="card">
        <h2>Privacy</h2>
        <p>
          Members are <strong>not</strong> visible to each other. Your profile, your posts and
          the replies you receive are visible only to you and to the hub administrator, who is
          the only person able to see every member and every discussion.
        </p>
      </div>
      <div className="card" id="discussion">
        <h2>Discussion</h2>
        <p>Post a question or update and the administrator will reply.</p>
        {s?.role === "member" && <Link href="/dashboard">Open your discussion →</Link>}
        {s?.role === "admin" && <Link href="/admin">Open the admin console →</Link>}
        {!s && (
          <p>
            <Link href="/register">Create an account</Link> or <Link href="/login">sign in</Link>.
          </p>
        )}
      </div>
    </>
  );
}
