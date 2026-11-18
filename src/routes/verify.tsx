import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, BookmarkCheck, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ResultView } from "@/components/verify/ResultView";
import { PdfDrop } from "@/components/verify/PdfDrop";
import { runVerification } from "@/lib/verify.functions";
import { createClaim, saveVerification } from "@/lib/claims";
import { useAuth } from "@/hooks/useAuth";
import type { VerifyResponse } from "@/lib/verify-types";
import type { ExtractedPdf } from "@/lib/pdf-extract";

const SAMPLES = [
  { label: "Exact number", claim: "Vaswani et al. report that the Transformer achieves 28.4 BLEU on the WMT 2014 English-to-German translation task.", doi: "10.48550/arXiv.1706.03762" },
  { label: "Overgeneralized", claim: "The Transformer outperforms all prior models on every machine translation benchmark.", doi: "10.48550/arXiv.1706.03762" },
  { label: "Reversed finding", claim: "He et al. found that their 152-layer residual networks had higher complexity than VGG nets.", doi: "10.1109/CVPR.2016.90" },
];

type Search = { sample?: number; doi?: string; claim?: string; claimId?: string };

export const Route = createFileRoute("/verify")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    const n = Number(s["sample"]);
    if (Number.isInteger(n) && n >= 1 && n <= SAMPLES.length) out.sample = n;
    if (typeof s["doi"] === "string") out.doi = s["doi"];
    if (typeof s["claim"] === "string") out.claim = s["claim"];
    if (typeof s["claimId"] === "string") out.claimId = s["claimId"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Verify a Citation — CiteVerify AI" },
      { name: "description", content: "Check a scientific claim against its cited paper's abstract or uploaded full-text PDF." },
      { property: "og:title", content: "Verify a Citation — CiteVerify AI" },
      { property: "og:description", content: "Paste a claim, add the DOI or PDF, and see whether the source supports it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyPage,
});

const STAGES_DOI = ["Resolving DOI", "Retrieving source record", "Comparing claim to evidence", "Checking provenance"];
const STAGES_PDF = ["Finding relevant passages", "Retrieving publication record", "Comparing claim to full text", "Checking provenance"];

function VerifyPage() {
  const search = Route.useSearch();
  const initial = search.sample ? SAMPLES[search.sample - 1] : null;
  const [claim, setClaim] = useState(search.claim ?? initial?.claim ?? "");
  const [doi, setDoi] = useState(search.doi ?? initial?.doi ?? "");
  const [mode, setMode] = useState<"doi" | "pdf">("doi");
  const [pdf, setPdf] = useState<(ExtractedPdf & { name: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const verify = useServerFn(runVerification);
  const { user } = useAuth();
  const qc = useQueryClient();
  const stages = mode === "pdf" ? STAGES_PDF : STAGES_DOI;

  const canSubmit = claim.trim().length >= 10 && (mode === "doi" ? doi.trim().length >= 6 : Boolean(pdf?.pages.length));

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setResult(null);
    setSaved("idle");
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, stages.length - 1)), 1600);
    try {
      const res = await verify({ data: { claim, doi: doi.trim(), pdf: mode === "pdf" && pdf ? { title: pdf.title ?? pdf.name, pages: pdf.pages } : undefined } });
      setResult(res);
      if (res.ok && user) {
        setSaved("saving");
        try {
          const id = search.claimId ?? (await createClaim(claim.trim(), res.source.doi || doi.trim() || `pdf:${pdf?.name ?? "upload"}`));
          await saveVerification(id, res);
          qc.invalidateQueries({ queryKey: ["claims"] });
          setSaved("saved");
        } catch (err) {
          console.error(err);
          setSaved("error");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setResult({ ok: false, error: /DOI|short|claim|PDF/i.test(msg) ? "Please enter a claim (10+ characters) and a valid DOI like 10.1038/xxxx, or upload a PDF." : "Something went wrong. Please try again." });
    } finally {
      clearInterval(t);
      setLoading(false);
    }
  }

  const tab = (m: "doi" | "pdf", label: string) => (
    <button type="button" onClick={() => setMode(m)} className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${mode === m ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );

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
              <textarea id="claim" value={claim} onChange={(e) => setClaim(e.target.value)} rows={4} maxLength={1500} placeholder="Paste the sentence from the citing paper…" className="mt-2 w-full resize-none rounded-xl border bg-background/60 p-3 text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <div className="flex gap-1 rounded-xl border p-1">{tab("doi", "Abstract via DOI")}{tab("pdf", "Full text via PDF")}</div>
            {mode === "pdf" && <PdfDrop value={pdf} onChange={(v) => { setPdf(v); if (v?.doi && !doi) setDoi(v.doi); }} />}
            <div>
              <label htmlFor="doi" className="text-sm font-medium">Cited DOI {mode === "pdf" && <span className="font-normal text-muted-foreground">(optional)</span>}</label>
              <input id="doi" value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.1038/nature12373" className="mt-2 w-full rounded-xl border bg-background/60 p-3 font-mono text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <button type="submit" disabled={loading || !canSubmit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-shadow hover:shadow-glow disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Verifying…" : "Verify claim"}
            </button>
            {!user && <p className="text-center text-xs text-muted-foreground"><Link to="/auth" search={{ redirect: "/verify" }} className="text-primary hover:underline">Sign in</Link> to save results to your library.</p>}
            <div className="border-t pt-5">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Sample claims · real papers</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SAMPLES.map((s) => (
                  <button key={s.label} type="button" onClick={() => { setClaim(s.claim); setDoi(s.doi); setMode("doi"); setResult(null); }} className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </form>

          <section aria-live="polite">
            {loading && <Progress stages={stages} stage={stage} />}
            {!loading && !result && <Empty />}
            {!loading && result && !result.ok && (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-6">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <p>{result.error}</p>
              </div>
            )}
            {!loading && result?.ok && (
              <ResultView
                r={result}
                footer={
                  saved !== "idle" && (
                    <p className="mt-4 flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
                      {saved === "saving" && <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>}
                      {saved === "saved" && <><BookmarkCheck className="h-4 w-4 text-supported" /> Saved. <Link to="/library" className="text-primary hover:underline">Open library</Link></>}
                      {saved === "error" && <span className="text-destructive">Couldn't save this result.</span>}
                    </p>
                  )
                }
              />
            )}
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
        <p className="mt-2 text-sm text-muted-foreground">Try a sample claim, or upload a paper to check against its full text.</p>
      </div>
    </div>
  );
}

function Progress({ stages, stage }: { stages: string[]; stage: number }) {
  return (
    <div className="glass rounded-2xl p-8">
      <div className="relative h-1 overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 w-1/3 animate-scan rounded-full bg-primary" />
      </div>
      <ol className="mt-8 space-y-4">
        {stages.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 text-sm transition-colors ${i <= stage ? "text-foreground" : "text-muted-foreground/50"}`}>
            {i < stage ? <CheckCircle2 className="h-4 w-4 text-primary" /> : i === stage ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="h-4 w-4 rounded-full border" />}
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
