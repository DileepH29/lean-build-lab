import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowRight, FileSearch, Link2, Scale, ShieldCheck, Quote, Fingerprint, Database } from "lucide-react";
import { SiteHeader, Logo } from "@/components/SiteHeader";

const HeroScene = lazy(() => import("@/components/HeroScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CiteVerify AI — Every Scientific Claim Deserves Evidence" },
      { name: "description", content: "Check whether a scientific claim is genuinely supported by the publication it cites, with exact evidence passages." },
      { property: "og:title", content: "CiteVerify AI — Every Scientific Claim Deserves Evidence" },
      { property: "og:description", content: "Check whether a scientific claim is genuinely supported by the publication it cites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const steps = [
  { icon: Quote, title: "Paste a claim", text: "Drop in the sentence from a paper and the DOI it cites." },
  { icon: Database, title: "Retrieve the source", text: "We pull the real record from OpenAlex and Crossref. Nothing invented." },
  { icon: Scale, title: "Compare the evidence", text: "AI checks numbers, scope and causal language against the source text." },
  { icon: FileSearch, title: "Read the verdict", text: "Get a status, verbatim evidence, reasoning and stated limits." },
];

const features = [
  { icon: Fingerprint, title: "Provenance guard", text: "Every quoted passage is checked to exist word-for-word in the source. Anything else is discarded." },
  { icon: Scale, title: "Five honest verdicts", text: "Supported, partially supported, unsupported, contradicted or unverifiable — never forced." },
  { icon: Link2, title: "Real publication records", text: "Titles, authors, venues and retraction flags come straight from open scholarly databases." },
  { icon: ShieldCheck, title: "Disclosed uncertainty", text: "Confidence is model confidence, not truth. Abstract-only checks are labelled as such." },
];

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SiteHeader />

      <section className="relative flex min-h-[100svh] items-center">
        <div className="absolute inset-0 bg-hero" />
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="absolute inset-0 opacity-40 md:left-[45%] md:opacity-100">{mounted && <Suspense fallback={null}><HeroScene /></Suspense>}</div>
        <div className="relative mx-auto w-full max-w-6xl px-6 pt-24">
          <div className="max-w-xl animate-rise">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full glass px-3 py-1 font-mono text-xs uppercase tracking-widest text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Evidence before acceptance
            </p>
            <h1 className="font-display text-6xl leading-[0.95] tracking-tight md:text-8xl">
              Every scientific claim <em className="text-gradient">deserves evidence.</em>
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              CiteVerify checks whether a claim is actually backed by the paper it cites — and shows you the exact passage.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/verify" className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">
                Start Verification <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/verify" search={{ sample: 1 }} className="inline-flex items-center rounded-full glass px-6 py-3 font-medium transition-colors hover:bg-secondary">
                Try a sample claim
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-28">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">How it works</p>
        <h2 className="mt-3 font-display text-5xl">Four steps from claim to verdict.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="glass rounded-2xl p-6 transition-transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <s.icon className="h-5 w-5 text-primary" />
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-8 text-lg font-medium">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Before &amp; after</p>
            <h2 className="mt-3 font-display text-5xl">Small overstatements, caught.</h2>
            <p className="mt-4 text-muted-foreground">
              A real example from “Attention Is All You Need” (Vaswani et al., 2017). The paper reports results on two translation tasks — not every benchmark.
            </p>
          </div>
          <div className="space-y-3">
            <div className="glass rounded-2xl p-5">
              <p className="font-mono text-xs text-muted-foreground">CLAIM IN A CITING PAPER</p>
              <p className="mt-2">“The Transformer outperforms all prior models on every machine translation benchmark.”</p>
            </div>
            <div className="rounded-2xl border border-partial/40 bg-partial/10 p-5">
              <p className="font-mono text-xs text-partial">SOURCE SAYS</p>
              <p className="mt-2 text-sm">“Experiments on two machine translation tasks show these models to be superior in quality…”</p>
              <p className="mt-3 text-xs text-muted-foreground">Expected verdict: overgeneralized — run it yourself on the next page.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Trust &amp; transparency</p>
        <h2 className="mt-3 font-display text-5xl">Built to never make things up.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="glass group rounded-2xl p-7 transition-shadow hover:shadow-glow">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-5 text-xl font-medium">{f.title}</h3>
              <p className="mt-2 text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl glass px-8 py-16 text-center">
          <div className="absolute inset-0 bg-hero opacity-70" />
          <div className="relative">
            <h2 className="font-display text-5xl md:text-6xl">Check a citation in seconds.</h2>
            <Link to="/verify" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 font-medium text-primary-foreground shadow-glow">
              Start Verification <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center">
          <Logo />
          <p>Source data from OpenAlex &amp; Crossref. AI verdicts need human review.</p>
          <p>© {new Date().getFullYear()} CiteVerify AI</p>
        </div>
      </footer>
    </div>
  );
}
