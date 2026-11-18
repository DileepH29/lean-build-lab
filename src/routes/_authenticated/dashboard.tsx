import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/verify/ResultView";
import { claimsQuery } from "@/lib/claims";
import { integrityScore, STATUSES, statusMeta } from "@/lib/verify-types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CiteVerify AI" }, { name: "description", content: "Your verdicts, sources and verification history." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(claimsQuery),
  errorComponent: () => <p className="p-10 text-center text-muted-foreground">Couldn't load your dashboard. Please refresh.</p>,
  component: Dashboard,
});

const COLOR_VAR: Record<string, string> = { supported: "var(--supported)", partial: "var(--partial)", unsupported: "var(--unsupported)", contradicted: "var(--contradicted)", unverifiable: "var(--unverifiable)" };

function Dashboard() {
  const { data: claims } = useSuspenseQuery(claimsQuery);
  const latest = claims.map((c) => c.verifications.at(-1)).filter((v): v is NonNullable<typeof v> => Boolean(v));
  const runs = claims.flatMap((c) => c.verifications.map((v) => ({ ...v, claim: c }))).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const counts = STATUSES.map((s) => ({ s, n: latest.filter((v) => v.status === s).length }));
  const score = integrityScore(latest.map((v) => v.status));
  const sources = new Map<string, { title: string; doi: string; n: number }>();
  latest.forEach((v) => { const d = v.source.doi || v.source.title || "?"; const e = sources.get(d) ?? { title: v.source.title ?? d, doi: v.source.doi ?? "", n: 0 }; e.n++; sources.set(d, e); });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Dashboard</p>
        <h1 className="mt-2 font-display text-5xl">Your evidence record.</h1>
        {!claims.length ? (
          <div className="glass mt-10 rounded-2xl p-10 text-center">
            <p className="font-display text-3xl">No claims yet.</p>
            <Link to="/verify" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Verify your first claim</Link>
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {[["Claims", claims.length], ["Verification runs", runs.length], ["Sources", sources.size], ["Integrity score", score === null ? "—" : `${score}%`]].map(([l, v]) => (
                <div key={l} className="glass rounded-2xl p-5"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-2 font-mono text-3xl">{v}</p></div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Integrity score = (supported + ½ × partially supported) ÷ judged claims, using each claim's latest verdict. Unverifiable claims are excluded.</p>
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
              <div className="glass rounded-2xl p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Latest verdicts</p>
                <div className="h-52"><ResponsiveContainer><PieChart><Pie data={counts.filter((c) => c.n)} dataKey="n" nameKey="s" innerRadius={50} outerRadius={80} stroke="none">{counts.filter((c) => c.n).map((c) => <Cell key={c.s} fill={COLOR_VAR[statusMeta(c.s).color]} />)}</Pie><Tooltip formatter={(v, n) => [v, statusMeta(String(n)).label]} /></PieChart></ResponsiveContainer></div>
                <ul className="space-y-1.5 text-sm">{counts.map((c) => <li key={c.s} className="flex justify-between"><StatusChip status={c.s} /><span className="font-mono">{c.n}</span></li>)}</ul>
              </div>
              <div className="glass rounded-2xl p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">History timeline</p>
                <ol className="mt-4 max-h-[420px] space-y-4 overflow-auto border-l pl-5">
                  {runs.slice(0, 50).map((r) => (
                    <li key={r.id} className="relative">
                      <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><StatusChip status={r.status} /> {new Date(r.created_at).toLocaleString()} · {Math.round(r.confidence * 100)}%</div>
                      <p className="mt-1 text-sm">{r.claim.claim_text}</p>
                      <p className="text-xs text-muted-foreground">{r.source.title}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="glass mt-4 rounded-2xl p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Sources cited</p>
              <ul className="mt-3 divide-y text-sm">{[...sources.values()].map((s) => (
                <li key={s.doi || s.title} className="flex items-center justify-between gap-3 py-2">
                  <span>{s.title} <span className="text-xs text-muted-foreground">· {s.n} claim{s.n > 1 ? "s" : ""}</span></span>
                  {s.doi && <Link to="/graph" search={{ doi: s.doi }} className="shrink-0 text-xs text-primary hover:underline">Network</Link>}
                </li>))}</ul>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
