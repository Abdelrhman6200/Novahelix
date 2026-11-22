import "./globals.css";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logout } from "./actions";

export const metadata = {
  title: "Nova Helix Research Hub",
  description: "A private research hub. Only the administrator can see all members and activity.",
};

export default async function RootLayout({ children }) {
  const s = await getSession();
  return (
    <html lang="en">
      <body>
        <header>
          <Link href="/" className="brand">🧬 Nova Helix Research Hub</Link>
          <nav>
            <Link href="/">Overview</Link>
            {!s && <Link href="/login">Sign in</Link>}
            {!s && <Link href="/register">Join</Link>}
            {s?.role === "member" && <Link href="/dashboard">Discussion</Link>}
            {s?.role === "admin" && <Link href="/admin">Admin</Link>}
            {s && (
              <form action={logout}>
                <button className="ghost">Sign out</button>
              </form>
            )}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
