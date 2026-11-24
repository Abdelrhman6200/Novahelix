import { Logo } from "@/components/ui";

// Split-screen layout shared by the sign-in and registration pages.
export default function AuthShell({ children }) {
  return (
    <div className="auth">
      <section className="auth-art">
        <div className="inline" style={{ gap: 12 }}>
          <Logo size={38} />
          <b style={{ fontSize: "1.1rem", letterSpacing: "-.01em" }}>Nova Helix Research Hub</b>
        </div>
        <div>
          <h2>Where research ideas become published work.</h2>
          <p>A private workspace for the Nova Helix Research Association: track your projects, share ideas and stay in touch with your manager.</p>
          <ul>
            <li><i>◆</i><span>See the progress and pace of every project you work on</span></li>
            <li><i>◆</i><span>Respond to new research ideas privately</span></li>
            <li><i>◆</i><span>Your activity is visible only to you and your manager</span></li>
          </ul>
        </div>
        <svg className="helix" viewBox="0 0 120 200" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M20 10c0 40 80 40 80 80s-80 40-80 80M100 10c0 40-80 40-80 80s80 40 80 80" />
          <path d="M30 28h60M30 62h60M30 118h60M30 152h60" />
        </svg>
      </section>
      <section className="auth-main">
        <div className="auth-card">{children}</div>
      </section>
    </div>
  );
}
