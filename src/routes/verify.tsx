import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { runVerification } from "@/lib/verify.functions";
import { STATUS_META, type VerifyResponse, type VerificationResult } from "@/lib/verify-types";

const SAMPLES = [
  { label: "Exact number", claim: "Vaswani et al. report that the Transformer achieves 28.4 BLEU on the WMT 2014 English-to-German translation task.", doi: "10.48550/arXiv.1706.03762" },
  { label: "Overgeneralized", claim: "The Transformer outperforms all prior models on every machine translation benchmark.", doi: "10.48550/arXiv.1706.03762" },
  { label: "Reversed finding", claim: "He et al. found that their 152-layer residual networks had higher complexity than VGG nets.", doi: "10.1109/CVPR.2016.90" },
];

export const Route = createFileRoute("/verify")({
  validateSearch: (s: Record<string, unknown>): { sample?: number } => {
    const n = Number(s.sample);
    return Number.isInteger(n) && n >= 1 && n <= SAMPLES.length ? { sample: n } : {};
  },
  head: () => ({
    meta: [
      { title: "Verify a Citation — CiteVerify AI" },
      { name: "description", content: "Paste a scientific claim and its cited DOI to see whether the source genuinely supports it." },
      { property: "og:title", content: "Verify a Citation — CiteVerify AI" },
      { property: "og:description", content: "Paste a claim and its DOI to check it against the original publication." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyPage,
});

const STAGES = ["Resolving DOI", "Retrieving source record", "Comparing claim to evidence", "Checking provenance"];

function VerifyPage() {
  const { sample } = Route.useSearch();
  const initial = sample ? SAMPLES[sample - 1] : null;
  const [claim, setClaim] = useState(initial?.claim ?? "");
  const [doi, setDoi] = useState(initial?.doi ?? "");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const verify = useServerFn(runVerification);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setResult(null);
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1600);
    try {
      setResult(await verify({ data: { claim, doi } }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setResult({ ok: false, error: /DOI|short|claim/i.test(msg) ? "Please enter a claim (10+ characters) and a valid DOI like 10.1038/xxxx." : "Something went wrong. Please try again." });
    } finally {
      clearInterval(t);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="absolute inset-x-0 top-0 h-[480px] bg-hero opacity-70" />
      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-32">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Verification workspace</p>
        <h1 className="mt-3 font-display text-5xl md:text-6xl">Does the source really say that?</h1>

        <div className="mt-10 grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={submit} className="glass h-fit space-y-5 rounded-2xl p-6">
            <div>
              <label htmlFor="claim" className="text-sm font-medium">Claim</label>
              <textarea id="claim" value={claim} onChange={(e) => setClaim(e.target.value)} rows={5} maxLength={1500} placeholder="Paste the sentence from the citing paper…" className="mt-2 w-full resize-none rounded-xl border bg-background/60 p-3 text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <div>
              <label htmlFor="doi" className="text-sm font-medium">Cited DOI</label>
              <input id="doi" value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.1038/nature12373" className="mt-2 w-full rounded-xl border bg-background/60 p-3 font-mono text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <button type="submit" disabled={loading || claim.trim().length < 10 || doi.trim().length < 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-shadow hover:shadow-glow disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Verifying…" : "Verify claim"}
            </button>
            <div className="border-t pt-5">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Sample claims · real papers</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SAMPLES.map((s) => (
                  <button key={s.label} type="button" onClick={() => { setClaim(s.claim); setDoi(s.doi); setResult(null); }} className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </form>

          <section aria-live="polite">
            {loading && <Progress stage={stage} />}
            {!loading && !result && <Empty />}
            {!loading && result && !result.ok && (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-6">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <p>{result.error}</p>
              </div>
            )}
            {!loading && result?.ok && <Result r={result} />}
          </section>
        </div>
      </main>
    </div>
  );
}

function Empty() {
  return (
    <div className="glass grid min-h-[360px] place-items-center rounded-2xl p-10 text-center">
      <div>
        <p className="font-display text-3xl">Your verdict will appear here.</p>
        <p className="mt-2 text-sm text-muted-foreground">Try a sample claim to see how it works.</p>
      </div>
    </div>
  );
}

function Progress({ stage }: { stage: number }) {
  return (
    <div className="glass rounded-2xl p-8">
      <div className="relative h-1 overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 w-1/3 animate-scan rounded-full bg-primary" />
      </div>
      <ol className="mt-8 space-y-4">
        {STAGES.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 text-sm transition-colors ${i <= stage ? "text-foreground" : "text-muted-foreground/50"}`}>
            {i < stage ? <CheckCircle2 className="h-4 w-4 text-primary" /> : i === stage ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="h-4 w-4 rounded-full border" />}
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  supported: "border-supported/40 bg-supported/10 text-supported",
  partial: "border-partial/40 bg-partial/10 text-partial",
  unsupported: "border-unsupported/40 bg-unsupported/10 text-unsupported",
  contradicted: "border-contradicted/40 bg-contradicted/10 text-contradicted",
  unverifiable: "border-unverifiable/40 bg-unverifiable/10 text-unverifiable",
};

function highlight(text: string, good: string[], bad: string[]) {
  const marks = [...good.map((g) => ({ s: g, k: "good" })), ...bad.map((b) => ({ s: b, k: "bad" }))];
  if (!marks.length) return text;
  const lower = text.toLowerCase();
  const ranges = marks
    .map((m) => ({ ...m, i: lower.indexOf(m.s.toLowerCase().replace(/\s+/g, " ").trim()) }))
    .filter((m) => m.i >= 0)
    .sort((a, b) => a.i - b.i);
  const out: React.ReactNode[] = [];
  let pos = 0;
  ranges.forEach((m, idx) => {
    if (m.i < pos) return;
    out.push(text.slice(pos, m.i));
    out.push(<mark key={idx} className={m.k === "good" ? "rounded bg-supported/25 px-0.5 text-foreground" : "rounded bg-contradicted/30 px-0.5 text-foreground"}>{text.slice(m.i, m.i + m.s.length)}</mark>);
    pos = m.i + m.s.length;
  });
  out.push(text.slice(pos));
  return out;
}

function Result({ r }: { r: VerificationResult }) {
  const meta = STATUS_META[r.status];
  return (
    <div className="space-y-4 animate-rise">
      <div className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6 ${STATUS_STYLES[meta.color]}`}>
        <div>
          <p className="font-mono text-xs uppercase tracking-widest opacity-80">Verdict</p>
          <p className="mt-1 font-display text-4xl">{meta.label}</p>
          <p className="mt-1 text-sm text-foreground/80">{meta.desc}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs uppercase tracking-widest opacity-80">Model confidence</p>
          <p className="font-mono text-3xl">{Math.round(r.confidence * 100)}%</p>
          <p className="text-xs text-muted-foreground">Not a measure of scientific truth</p>
        </div>
      </div>

      {r.source.isRetracted && (
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
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Source {r.evidenceScope === "abstract" ? "· abstract" : ""}</p>
            <a href={r.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Open publication <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="mt-3 font-medium">{r.source.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {r.source.authors.slice(0, 4).join(", ")}{r.source.authors.length > 4 ? " et al." : ""} · {r.source.venue ?? "Unknown venue"} · {r.source.year ?? "n.d."}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">doi:{r.source.doi} · via {r.source.provider}</p>
          {r.source.abstract ? (
            <p className="mt-4 max-h-64 overflow-auto pr-2 text-sm leading-relaxed text-muted-foreground">{highlight(r.source.abstract, r.evidence, r.conflicts)}</p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No accessible source text.</p>
          )}
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
      </div>
    </div>
  );
}
