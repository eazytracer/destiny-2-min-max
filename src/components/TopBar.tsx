import Link from "next/link";

export function TopBar() {
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/" className="brand">
          <span className="mark">◈</span>
          <span>SYNERGY&nbsp;EXPLORER</span>
        </Link>
        <nav className="nav">
          <Link href="/">Explore</Link>
          <Link href="/mechanics">Mechanics</Link>
          <span className="disabled" title="Phase 2">
            Build Workspace
          </span>
          <span className="disabled" title="Phase 2 — requires Bungie sign-in">
            My Guardian
          </span>
          <Link href="/data">Data &amp; Sources</Link>
        </nav>
      </div>
    </header>
  );
}
