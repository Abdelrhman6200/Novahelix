"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  flask: "M9 3h6 M10 3v6.5L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9.5V3",
  chart: "M18 20V10 M12 20V4 M6 20v-6",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  bulb: "M9 18h6 M10 22h4 M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z",
};

export default function Nav({ items }) {
  const path = usePathname();
  const active = (href) => (href === "/admin" || href === "/dashboard" ? path === href : path.startsWith(href));
  return (
    <nav className="nav" aria-label="Main">
      {items.map((it) =>
        it.label && !it.href ? (
          <div className="nav-label" key={it.label}>{it.label}</div>
        ) : (
          <Link key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {ICONS[it.icon].split(" M").map((d, i) => (
                <path key={i} d={(i ? "M" : "") + d} />
              ))}
            </svg>
            {it.text}
          </Link>
        )
      )}
    </nav>
  );
}
