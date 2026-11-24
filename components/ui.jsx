// Small server-safe UI helpers shared across pages.

export const PROGRESS = {
  "Not Started": { pct: 0, tone: "gray", color: "#98a0c2" },
  "In Progress": { pct: 50, tone: "blue", color: "#4f7cf0" },
  "Under Review": { pct: 80, tone: "amber", color: "#e0a02a" },
  Completed: { pct: 100, tone: "green", color: "#2fb37a" },
};
export const PACE = { Slow: "red", Moderate: "amber", Fast: "green" };

export function Chip({ tone = "gray", plain, children }) {
  return <span className={`chip ${tone}${plain ? " plain" : ""}`}>{children}</span>;
}
export const ProgressChip = ({ value }) =>
  value ? <Chip tone={PROGRESS[value]?.tone || "gray"}>{value}</Chip> : <span className="mut">—</span>;
export const PaceChip = ({ value }) =>
  value ? <Chip tone={PACE[value] || "gray"}>{value}</Chip> : <span className="mut">—</span>;

export function Stage({ value }) {
  const pct = PROGRESS[value]?.pct ?? 0;
  return (
    <div role="img" aria-label={`${value || "No status"}: ${pct}% of stages`}>
      <div className="bar"><i style={{ width: `${Math.max(pct, 4)}%` }} /></div>
    </div>
  );
}

export function Avatar({ name = "?", size }) {
  const initials = name.replace(/\b(dr|mr|ms)\b\.?/gi, "").trim().split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className={`avatar${size === "lg" ? " lg" : ""}`} style={{ background: `hsl(${h} 55% 42%)` }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <div className="n">{value}</div>
      <div className="l">{label}</div>
      {hint && <div className="h">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

export function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#6366f1" />
      <path d="M10 6c0 6 12 6 12 12s-12 6-12 8M22 6c0 6-12 6-12 12s12 6 12 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 11h8M12 21h8" stroke="#c7d2fe" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
