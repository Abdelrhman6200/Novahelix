import { login } from "../actions";

export default async function Login({ searchParams }) {
  const { error } = await searchParams;
  return (
    <div className="card">
      <h1>Sign in</h1>
      {error && <p className="err">{error}</p>}
      <form action={login} className="stack">
        <input name="email" type="email" placeholder="Email" required autoComplete="email" />
        <input name="password" type="password" placeholder="Password" required autoComplete="current-password" />
        <button>Sign in</button>
      </form>
    </div>
  );
}
