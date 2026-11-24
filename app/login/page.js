import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { login, adminLogin } from "../actions";
import AuthShell from "@/components/AuthShell";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }) {
  const s = await getSession();
  if (s) redirect(s.role === "member" ? "/dashboard" : "/admin");
  const { error, as } = await searchParams;
  const admin = as === "admin";
  return (
    <AuthShell>
      <h1>{admin ? "Manager sign in" : "Welcome back"}</h1>
      <p className="mut">
        {admin ? "For the hub manager." : "Sign in to see your projects and research ideas."}
      </p>

      <div className="tabs" role="tablist">
        <Link href="/login" className={!admin ? "tab on" : "tab"} role="tab" aria-selected={!admin}>Member</Link>
        <Link href="/login?as=admin" className={admin ? "tab on" : "tab"} role="tab" aria-selected={admin}>Manager</Link>
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      <form action={admin ? adminLogin : login} className="stack">
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" autoFocus placeholder="you@institution.edu" />
        </label>
        <label>
          Password
          <input name="password" type="password" required autoComplete="current-password" placeholder="Your password" />
        </label>
        <button className="wide">{admin ? "Sign in as manager" : "Sign in"}</button>
      </form>

      {!admin && (
        <p className="mut center small" style={{ marginTop: 18 }}>
          New here? <Link href="/register">Create an account</Link>
        </p>
      )}
    </AuthShell>
  );
}
