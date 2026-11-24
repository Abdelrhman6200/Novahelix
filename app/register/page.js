import Link from "next/link";
import { register } from "../actions";
import AuthShell from "@/components/AuthShell";

export const metadata = { title: "Join" };

export default async function Register({ searchParams }) {
  const { error } = await searchParams;
  return (
    <AuthShell>
      <h1>Join the hub</h1>
      <p className="mut">Create your account to see your research projects.</p>
      {error && <p className="alert" role="alert" style={{ marginTop: 16 }}>{error}</p>}
      <form action={register} className="stack" style={{ marginTop: 20 }}>
        <label>Full name<input name="name" required autoComplete="name" /></label>
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label>Institution <span className="mut" style={{ fontWeight: 400 }}>(optional)</span><input name="institution" autoComplete="organization" /></label>
        <label>Password<input name="password" type="password" required minLength={10} autoComplete="new-password" placeholder="At least 10 characters" /></label>
        <button className="wide">Create account</button>
      </form>
      <p className="mut center small" style={{ marginTop: 18 }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
