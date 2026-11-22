import { register } from "../actions";

export default async function Register({ searchParams }) {
  const { error } = await searchParams;
  return (
    <div className="card">
      <h1>Join the hub</h1>
      {error && <p className="err">{error}</p>}
      <form action={register} className="stack">
        <input name="name" placeholder="Full name" required />
        <input name="email" type="email" placeholder="Email" required autoComplete="email" />
        <input name="institution" placeholder="Institution (optional)" />
        <input name="password" type="password" placeholder="Password (10+ characters)" required minLength={10} autoComplete="new-password" />
        <button>Create account</button>
      </form>
    </div>
  );
}
