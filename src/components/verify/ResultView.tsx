import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ExternalLink, Network, XCircle } from "lucide-react";
import { statusMeta, STATUS_STYLES, type Excerpt } from "@/lib/verify-types";

export function highlight(text: string, good: string[], bad: string[]): ReactNode {
  const marks = [...good.map((g) => ({ s: g, k: "good" })), ...bad.map((b) => ({ s: b, k: "bad" }))];
  if (!marks.length) return text;
  const flat = text.replace(/\s+/g, " ");
  const lower = flat.toLowerCase();
  const ranges = marks
    .map((m) => { const s = m.s.replace(/\s+/g, " ").trim(); return { ...m, s, i: lower.indexOf(s.toLowerCase()) }; })
    .filter((m) => m.i >= 0)
    .sort((a, b) => a.i - b.i);
  const out: ReactNode[] = [];
  let pos = 0;
  ranges.forEach((m, idx) => {
    if (m.i < pos) return;
    out.push(flat.slice(pos, m.i));
    out.push(<mark key={idx} className={m.k === "good" ? "rounded bg-supported/25 px-0.5 text-foreground" : "rounded bg-contradicted/30 px-0.5 text-foreground"}>{flat.slice(m.i, m.i + m.s.length)}</mark>);
    pos = m.i + m.s.length;
  });
  out.push(flat.slice(pos));
  return out;
}

export interface ResultData {
  claim: string;
  status: string;
  confidence: number;
  evidence: string[];
  conflicts: string[];
  reasoning: string;
  limitations: string[];
  evidenceScope: string;
  excerpts: Excerpt[];
  source: { title?: string; authors?: string[]; venue?: string | null; year?: number | null; doi?: string; url?: string; provider?: string; isRetracted?: boolean };
}

export function VerdictBanner({ status, confidence }: { status: string; confidence: number }) {
  const meta = statusMeta(status);
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6 ${STATUS_STYLES[meta.color]}`}>
      <div>
        <p className="font-mono text-xs uppercase tracking-widest opacity-80">Verdict</p>
        <p className="mt-1 font-display text-4xl">{meta.label}</p>
        <p className="mt-1 text-sm text-foreground/80">{meta.desc}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-xs uppercase tracking-widest opacity-80">Model confidence</p>
        <p className="font-mono text-3xl">{Math.round(confidence * 100)}%</p>
        <p className="text-xs text-muted-foreground">Not a measure of scientific truth</p>
      </div>
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  const m = statusMeta(status);
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLES[m.color]}`}>{m.label}</span>;
}

export function ResultView({ r, footer }: { r: ResultData; footer?: ReactNode }) {
  const s = r.source;
  const scopeLabel = r.evidenceScope === "full_text" ? "· full text" : r.evidenceScope === "abstract" ? "· abstract" : "";
  return (
    <div className="space-y-4 animate-rise">
      <VerdictBanner status={r.status} confidence={r.confidence} />
      {s.isRetracted && (
        <div className="flex items-center gap-2 rounded-xl border border-contradicted/40 bg-contradicted/10 p-4 text-sm">
          <XCircle className="h-4 w-4 text-contradicted" /> OpenAlex marks this publication as retracted.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Claim</p>
          <p className="mt-3 leading-relaxed">{r.claim}</p>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">Reasoning</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.reasoning}</p>
          {s.doi && (
            <Link to="/graph" search={{ doi: s.doi, claim: r.claim, status: r.status }} className="mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors hover:border-primary">
              <Network className="h-4 w-4 text-primary" /> Explore citation network
            </Link>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Source {scopeLabel}</p>
            {s.url && (
              <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Open publication <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p className="mt-3 font-medium">{s.title}</p>
          {(s.authors?.length || s.venue || s.year) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {(s.authors ?? []).slice(0, 4).join(", ")}{(s.authors?.length ?? 0) > 4 ? " et al." : ""} · {s.venue ?? "Unknown venue"} · {s.year ?? "n.d."}
            </p>
          )}
          <p className="mt-1 font-mono text-xs text-muted-foreground">{s.doi ? `doi:${s.doi} · ` : ""}via {s.provider}</p>
          <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-2">
            {r.excerpts.length ? (
              r.excerpts.map((e, i) => (
                <div key={i}>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-primary/80">{e.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{highlight(e.text, r.evidence, r.conflicts)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No accessible source text.</p>
            )}
          </div>
          {(r.evidence.length > 0 || r.conflicts.length > 0) && (
            <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
              {r.evidence.length > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-supported" /> Supporting</span>}
              {r.conflicts.length > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-contradicted" /> Conflicting</span>}
            </div>
          )}
        </div>
      </div>
      <div className="glass rounded-2xl p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Limitations</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {r.limitations.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
        {footer}
      </div>
    </div>
  );
}
