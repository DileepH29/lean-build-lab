import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/SiteHeader";

const safePath = (p: unknown) => (typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p : "/dashboard");

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
  head: () => ({
    meta: [
      { title: "Sign in — CiteVerify AI" },
      { name: "description", content: "Sign in to save claims, track verdicts and revisit your verification history." },
      { property: "og:title", content: "Sign in — CiteVerify AI" },
      { property: "og:description", content: "Save claims and track how verdicts change over time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const GoogleG = () => (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const target = safePath(redirect);

  useEffect(() => {
    if (redirect) sessionStorage.setItem("cv_after_auth", target);
    const go = () => { const t = safePath(sessionStorage.getItem("cv_after_auth") ?? target); sessionStorage.removeItem("cv_after_auth"); navigate({ to: t }); };
    supabase.auth.getSession().then(({ data }) => data.session && go());
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) go(); });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirect, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Password reset link sent. Check your email.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Sign-in didn't complete. Please try again.");
  }

  const input = "w-full rounded-xl border bg-background/60 p-3 text-sm outline-none transition-colors focus:border-primary";
  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="absolute inset-0 bg-hero" />
      <div className="relative w-full max-w-sm animate-rise">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="glass rounded-2xl p-7">
          <h1 className="font-display text-4xl">{mode === "in" ? "Welcome back" : mode === "up" ? "Create account" : "Reset password"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Save claims and track every verdict.</p>
          {mode !== "forgot" && (
            <div className="mt-6 space-y-2">
              <button type="button" onClick={() => oauth("google")} className="flex w-full items-center justify-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary">
                <GoogleG /> Continue with Google
              </button>
              <button type="button" onClick={() => oauth("lovable")} className="flex w-full items-center justify-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary">
                <LovableMark className="h-[18px] w-[18px]" /> Continue with Lovable
              </button>
              <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
            </div>
          )}
          <form onSubmit={submit} className={`space-y-3 ${mode === "forgot" ? "mt-6" : ""}`}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@lab.org" aria-label="Email" className={input} />
            {mode !== "forgot" && <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" className={input} />}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-shadow hover:shadow-glow disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}
            </button>
          </form>
          <div className="mt-5 flex justify-between text-xs text-muted-foreground">
            {mode === "in" ? (
              <>
                <button onClick={() => setMode("up")} className="hover:text-foreground">Create an account</button>
                <button onClick={() => setMode("forgot")} className="hover:text-foreground">Forgot password?</button>
              </>
            ) : (
              <button onClick={() => setMode("in")} className="hover:text-foreground">Back to sign in</button>
            )}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground"><Link to="/verify" className="hover:text-foreground">Continue without an account →</Link></p>
      </div>
    </div>
  );
}
