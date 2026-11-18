import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Play, Trash2 } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/verify/ResultView";
import { claimsQuery, createClaim, saveVerification, type ClaimRow } from "@/lib/claims";
import { runVerification } from "@/lib/verify.functions";
import { supabase } from "@/integrations/supabase/client";
import { DOI_RE, normalizeDoi, STATUSES, statusMeta } from "@/lib/verify-types";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Claims Library — CiteVerify AI" }, { name: "description", content: "Your saved claims and how their verdicts change over time." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(claimsQuery),
  errorComponent: () => <p className="p-10 text-center text-muted-foreground">Couldn't load your library. Please refresh.</p>,
  component: Library,
});

function Library() {
  const { data: claims } = useSuspenseQuery(claimsQuery);
  const qc = useQueryClient();
  const verify = useServerFn(runVerification);
  const [claim, setClaim] = useState("");
  const [doi, setDoi] = useState("");
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [running, setRunning] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["claims"] });

  async function run(c: { id: string; claim_text: string; doi: string }) {
    if (!DOI_RE.test(c.doi)) return toast.error("This claim was checked against a PDF. Re-run it from the verify page.");
    setRunning(c.id);
    try {
      const r = await verify({ data: { claim: c.claim_text, doi: c.doi } });
      if (!r.ok) toast.error(r.error);
      else { await saveVerification(c.id, r); toast.success(`Verdict: ${statusMeta(r.status).label}`); }
      refresh();
    } catch { toast.error("Verification failed. Please try again."); } finally { setRunning(null); }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const d = normalizeDoi(doi);
    if (claim.trim().length < 10 || !DOI_RE.test(d)) return toast.error("Enter a claim (10+ characters) and a valid DOI.");
    try {
      const id = await createClaim(claim.trim(), d, note.trim());
      setClaim(""); setDoi(""); setNote("");
      await refresh();
      run({ id, claim_text: claim.trim(), doi: d });
    } catch { toast.error("Couldn't save the claim."); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this claim and its history?")) return;
    const { error } = await supabase.from("claims").delete().eq("id", id);
    if (error) toast.error("Couldn't delete."); else refresh();
  }

  const shown = claims.filter((c) => (!q || (c.claim_text + c.doi + (c.note ?? "")).toLowerCase().includes(q.toLowerCase())) && (filter === "ALL" || c.verifications.at(-1)?.status === filter));
  const input = "w-full rounded-xl border bg-background/60 p-3 text-sm outline-none focus:border-primary";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Claims library</p>
        <h1 className="mt-2 font-display text-5xl">Every claim, every run.</h1>
        <form onSubmit={add} className="glass mt-8 grid gap-3 rounded-2xl p-5 md:grid-cols-[2fr_1fr_1fr_auto]">
          <input value={claim} onChange={(e) => setClaim(e.target.value)} placeholder="Claim text" aria-label="Claim" className={input} />
          <input value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="Cited DOI" aria-label="DOI" className={`${input} font-mono`} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" className={input} />
          <button className="rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground">Add &amp; verify</button>
        </form>
        <div className="mt-6 flex flex-wrap gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search claims" aria-label="Search claims" className="rounded-full border bg-background/60 px-4 py-1.5 text-sm outline-none focus:border-primary" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by verdict" className="rounded-full border bg-background px-3 py-1.5 text-sm">
            <option value="ALL">All verdicts</option>
            {STATUSES.map((s) => <option key={s} value={s}>{statusMeta(s).label}</option>)}
          </select>
        </div>
        <ul className="mt-4 space-y-3">
          {!shown.length && <li className="glass rounded-2xl p-8 text-center text-muted-foreground">No claims match.</li>}
          {shown.map((c) => <ClaimItem key={c.id} c={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} running={running === c.id} onRun={() => run(c)} onDelete={() => remove(c.id)} />)}
        </ul>
      </main>
    </div>
  );
}

function ClaimItem({ c, open, onToggle, running, onRun, onDelete }: { c: ClaimRow; open: boolean; onToggle: () => void; running: boolean; onRun: () => void; onDelete: () => void }) {
  const last = c.verifications.at(-1);
  const series = c.verifications.map((v, i) => ({ run: i + 1, confidence: Math.round(v.confidence * 100), status: v.status }));
  return (
    <li className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-start gap-3">
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="text-sm">{c.claim_text}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{c.doi} · {c.verifications.length} run{c.verifications.length === 1 ? "" : "s"}{c.note ? ` · ${c.note}` : ""}</p>
        </button>
        {last ? <StatusChip status={last.status} /> : <span className="text-xs text-muted-foreground">Not run</span>}
        <button onClick={onRun} disabled={running} aria-label="Run verification" className="rounded-full border p-2 hover:border-primary disabled:opacity-50">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}</button>
        <button onClick={onDelete} aria-label="Delete claim" className="rounded-full border p-2 hover:border-destructive"><Trash2 className="h-4 w-4" /></button>
      </div>
      {open && (
        <div className="mt-4 border-t pt-4">
          {series.length > 1 && (
            <div className="h-40"><ResponsiveContainer><LineChart data={series}><XAxis dataKey="run" stroke="var(--muted-foreground)" fontSize={11} /><YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} /><Tooltip formatter={(v) => [`${v}%`, "Confidence"]} /><Line type="monotone" dataKey="confidence" stroke="var(--primary)" strokeWidth={2} dot /></LineChart></ResponsiveContainer></div>
          )}
          <ol className="mt-2 space-y-2 text-sm">
            {[...c.verifications].reverse().map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2"><StatusChip status={v.status} /><span className="font-mono text-xs">{Math.round(v.confidence * 100)}%</span><span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()} · {v.evidence_scope.replace("_", " ")}</span><span className="w-full text-muted-foreground">{v.reasoning}</span></li>
            ))}
          </ol>
          {DOI_RE.test(c.doi) && <Link to="/graph" search={{ doi: c.doi, claim: c.claim_text, ...(last ? { status: last.status } : {}) }} className="mt-3 inline-block text-xs text-primary hover:underline">Explore citation network →</Link>}
        </div>
      )}
    </li>
  );
}
