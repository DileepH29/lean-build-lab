import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/profile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

const navCls = "rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground";
const active = { className: "text-foreground bg-secondary" };

export function Avatar({ src, name, size = 28 }: { src: string | null | undefined; name: string; size?: number }) {
  return src ? (
    <img src={src} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-full bg-accent font-medium text-accent-foreground" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function SiteHeader() {
  const { user, loading } = useAuth();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const navigate = useNavigate();
  const name = profile?.displayName || user?.email || "?";

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3">
      <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between gap-3 rounded-full glass px-5 py-2.5">
        <Logo />
        <nav className="flex items-center gap-1 overflow-x-auto text-sm">
          <Link to="/verify" className={navCls} activeProps={active}>Verify</Link>
          <Link to="/graph" className={navCls} activeProps={active}>Graph</Link>
          {user && <Link to="/library" className={navCls} activeProps={active}>Library</Link>}
          {user && <Link to="/dashboard" className={navCls} activeProps={active}>Dashboard</Link>}
          {!loading && !user && (
            <Link to="/auth" className="ml-1 rounded-full bg-primary px-4 py-1.5 font-medium text-primary-foreground transition-shadow hover:shadow-glow">Sign in</Link>
          )}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 rounded-full outline-none ring-primary focus-visible:ring-2" aria-label="Account menu">
                <Avatar src={profile?.avatar} name={name} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}><UserRound className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}><LogOut className="mr-2 h-4 w-4" /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
}
