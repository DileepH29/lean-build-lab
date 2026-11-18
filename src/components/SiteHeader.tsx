import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="5" className="fill-primary" />
        <circle cx="16" cy="16" r="12" fill="none" className="stroke-primary/50" strokeWidth="1.2" />
        <circle cx="27.5" cy="12" r="2.4" className="fill-violet" />
        <circle cx="6" cy="22" r="2" className="fill-primary/70" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight">
        CiteVerify <span className="text-primary">AI</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-full glass px-5 py-2.5">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/" className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>
            Overview
          </Link>
          <Link to="/verify" className="rounded-full bg-primary px-4 py-1.5 font-medium text-primary-foreground transition-shadow hover:shadow-glow">
            Start Verification
          </Link>
        </nav>
      </div>
    </header>
  );
}
