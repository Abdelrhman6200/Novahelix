import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { login, adminLogin } from "../actions";

export const metadata = { title: "Sign in · Nova Helix Research Hub" };

export default async function Login({ searchParams }) {
  const s = await getSession();
  if (s) redirect(s.role === "member" ? "/dashboard" : "/admin");
  const { error, as } = await searchParams;
  const admin = as === "admin";
  return (
    <div className="auth">
      <div className="card auth-card">
        <div className="auth-head">
          <div className="logo">🧬</div>
          <h1>{admin ? "Administrator sign in" : "Welcome back"}</h1>
          <p className="mut">
            {admin ? "Restricted area. Only the hub administrator can sign in here." : "Sign in to your Nova Helix Research Hub account."}
          </p>
        </div>

        <div className="tabs" role="tablist">
          <Link href="/login" className={!admin ? "tab on" : "tab"} role="tab" aria-selected={!admin}>Member</Link>
          <Link href="/login?as=admin" className={admin ? "tab on" : "tab"} role="tab" aria-selected={admin}>Administrator</Link>
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
          <button className="wide">{admin ? "Sign in as administrator" : "Sign in"}</button>
        </form>

        {!admin && (
          <p className="mut center">
            New here? <Link href="/register">Create an account</Link>
          </p>
        )}
      </div>
    </div>
  );
}
