import "./globals.css";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logout } from "./actions";
import Nav from "@/components/Nav";
import { Avatar, Logo } from "@/components/ui";

export const metadata = {
  title: { default: "Nova Helix Research Hub", template: "%s · Nova Helix" },
  description: "A private research hub. Only the manager can see all members and activity.",
};
export const viewport = { width: "device-width", initialScale: 1 };

const MANAGER_NAV = [
  { label: "Manage" },
  { href: "/admin", text: "Overview", icon: "grid" },
  { href: "/admin/members", text: "Members", icon: "users" },
  { href: "/admin/projects", text: "Research progress", icon: "chart" },
  { href: "/admin/discussions", text: "Discussions", icon: "message" },
  { href: "/admin/activity", text: "Activity log", icon: "clock" },
  { label: "Collaborate" },
  { href: "/ideas", text: "Research ideas", icon: "bulb" },
];
const ADMIN_NAV = MANAGER_NAV.filter((i) => i.href !== "/ideas" && i.label !== "Collaborate");
const MEMBER_NAV = [
  { href: "/dashboard", text: "My projects", icon: "flask" },
  { href: "/ideas", text: "Research ideas", icon: "bulb" },
  { href: "/messages", text: "Messages", icon: "message" },
];

export default async function RootLayout({ children }) {
  const s = await getSession();
  const items = !s ? null : s.role === "member" ? MEMBER_NAV : s.role === "manager" ? MANAGER_NAV : ADMIN_NAV;
  const name = s?.user?.name || "Administrator";
  return (
    <html lang="en">
      <body>
        {!s ? (
          children
        ) : (
          <div className="shell">
            <aside className="side">
              <Link href={s.role === "member" ? "/dashboard" : "/admin"} className="brand">
                <Logo />
                <span>Nova Helix<small>Research Hub</small></span>
              </Link>
              <Nav items={items} />
              <div className="side-foot">
                <div className="me">
                  <Avatar name={name} />
                  <div>
                    <b>{name}</b>
                    <span>{s.role === "member" ? "Member" : "Manager"}</span>
                  </div>
                </div>
                <form action={logout}>
                  <button className="btn ghost sm">Sign out</button>
                </form>
              </div>
            </aside>
            <main className="content">{children}</main>
          </div>
        )}
      </body>
    </html>
  );
}
