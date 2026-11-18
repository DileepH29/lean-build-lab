import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Search, ShieldCheck, Crosshair } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/verify/ResultView";
import { loadGraph, type GNode } from "@/lib/graph-data";
import { DOI_RE, normalizeDoi } from "@/lib/verify-types";

const GraphScene = lazy(() => import("@/components/graph/GraphScene"));

type Search = { doi?: string; claim?: string; status?: string };

export const Route = createFileRoute("/graph")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const o: Search = {};
    for (const k of ["doi", "claim", "status"] as const) if (typeof s[k] === "string") o[k] = s[k] as string;
    return o;
  },
  head: () => ({
    meta: [
      { title: "3D Citation Network — CiteVerify AI" },
      { name: "description", content: "Explore how a paper connects to the research it cites and the work that cites it, in an interactive 3D network." },
      { property: "og:title", content: "3D Citation Network — CiteVerify AI" },
      { property: "og:description", content: "Explore real citation networks in 3D, built from OpenAlex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GraphPage,
});

const DEFAULT_DOI = "10.48550/arXiv.1706.03762";

function GraphPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/graph" });
  const doi = normalizeDoi(search.doi ?? DEFAULT_DOI);
  const [input, setInput] = useState(doi);
  const [selected, setSelected] = useState<GNode | null>(null);
  const [match, setMatch] = useState("");
  const [show, setShow] = useState({ reference: true, citing: true });
  const [view, setView] = useState<"3d" | "list">("3d");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => { setInput(doi); setSelected(null); }, [doi]);

  const q = useQuery({ queryKey: ["graph", doi], queryFn: () => loadGraph(doi), enabled: DOI_RE.test(doi), staleTime: 10 * 60_000, retry: 1 });
  const claim: GNode | undefined = useMemo(
    () => (search.claim && q.data ? { id: "claim", kind: "claim", title: search.claim, year: null, cited: 0, doi: null, status: search.status } : undefined),
    [search.claim, search.status, q.data],
  );

  const counts = q.data && {
    refs: q.data.nodes.filter((n) => n.kind === "reference").length,
    citing: q.data.nodes.filter((n) => n.kind === "citing").length,
    links: q.data.edges.length,
  };
  const listNodes = (q.data?.nodes ?? []).filter((n) => n.kind !== "center" && show[n.kind as "reference" | "citing"] && (!match || n.title.toLowerCase().includes(match.toLowerCase())));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="relative mx-auto max-w-7xl px-4 pb-16 pt-28 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Citation network</p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">How this paper connects.</h1>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); navigate({ search: { doi: normalizeDoi(input) } }); }} className="flex w-full max-w-md gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter a DOI" aria-label="DOI" className="flex-1 rounded-xl border bg-background/60 px-3 py-2 font-mono text-sm outline-none focus:border-primary" />
            <button className="rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">Load</button>
          </form>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={match} onChange={(e) => setMatch(e.target.value)} placeholder="Search titles" aria-label="Search papers in network" className="rounded-full border bg-background/60 py-1.5 pl-8 pr-3 outline-none focus:border-primary" />
          </div>
          {(["reference", "citing"] as const).map((k) => (
            <button key={k} onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))} aria-pressed={show[k]} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${show[k] ? "text-foreground" : "text-muted-foreground opacity-60"}`}>
              <span className={`h-2 w-2 rounded-full ${k === "reference" ? "bg-violet" : "bg-supported"}`} /> {k === "reference" ? "Cited by this paper" : "Papers citing it"}
            </button>
          ))}
          <div className="ml-auto flex rounded-full border p-0.5">
            {(["3d", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 ${view === v ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>{v === "3d" ? "3D" : "List view"}</button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="glass relative h-[620px] overflow-hidden rounded-2xl">
            {!DOI_RE.test(doi) && <Center>Enter a valid DOI like 10.1038/xxxx.</Center>}
            {q.isLoading && <Center><Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" /> Building network from OpenAlex…</Center>}
            {q.isError && <Center>{(q.error as Error).message === "not_found" ? "No OpenAlex record for this DOI." : "OpenAlex is unavailable right now. Try again shortly."}</Center>}
            {q.data && view === "3d" && mounted && (
              <Suspense fallback={<Center><Loader2 className="h-4 w-4 animate-spin" /></Center>}>
                <GraphScene data={q.data} claim={claim} selected={selected?.id ?? null} onSelect={setSelected} match={match} show={show} />
              </Suspense>
            )}
            {q.data && view === "list" && (
              <ul className="h-full divide-y overflow-auto">
                {listNodes.map((n) => (
                  <li key={n.id}>
                    <button onClick={() => setSelected(n)} className="flex w-full items-start gap-3 px-5 py-3 text-left text-sm hover:bg-secondary/50">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.kind === "reference" ? "bg-violet" : "bg-supported"}`} />
                      <span className="flex-1">{n.title}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{n.year ?? "n.d."} · {n.cited.toLocaleString()} cites</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {q.data && view === "3d" && <p className="pointer-events-none absolute bottom-3 left-4 text-xs text-muted-foreground">Drag to rotate · scroll to zoom · click a paper</p>}
          </div>

          <aside className="space-y-4">
            {q.data && (
              <div className="glass rounded-2xl p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Centre paper</p>
                <p className="mt-2 font-medium leading-snug">{q.data.center.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{q.data.center.year} · {q.data.center.cited.toLocaleString()} citations</p>
                {counts && (
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[["Cites", counts.refs], ["Cited by", counts.citing], ["Links", counts.links]].map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-secondary/60 py-2"><p className="font-mono text-lg">{v}</p><p className="text-[10px] text-muted-foreground">{l}</p></div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[11px] text-muted-foreground">Shows up to 30 references and the 20 most-cited citing papers.</p>
              </div>
            )}
            {claim && (
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Your claim</p>{claim.status && <StatusChip status={claim.status} />}</div>
                <p className="mt-2 text-sm">{claim.title}</p>
              </div>
            )}
            <div className="glass rounded-2xl p-5">
              {selected && selected.kind !== "claim" ? (
                <>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{selected.kind === "reference" ? "Cited by the centre paper" : selected.kind === "citing" ? "Cites the centre paper" : "Centre paper"}</p>
                  <p className="mt-2 font-medium leading-snug">{selected.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selected.year ?? "n.d."} · {selected.cited.toLocaleString()} citations</p>
                  <div className="mt-4 flex flex-col gap-2 text-sm">
                    {selected.doi && (
                      <>
                        <button onClick={() => navigate({ search: { doi: selected.doi! } })} className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:border-primary"><Crosshair className="h-4 w-4 text-primary" /> Centre network on this paper</button>
                        <Link to="/verify" search={{ doi: selected.doi }} className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:border-primary"><ShieldCheck className="h-4 w-4 text-primary" /> Verify a claim against it</Link>
                        <a href={`https://doi.org/${selected.doi}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:border-primary"><ExternalLink className="h-4 w-4 text-primary" /> Open publication</a>
                      </>
                    )}
                    {!selected.doi && <p className="text-xs text-muted-foreground">No DOI recorded for this work.</p>}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a paper to see details, re-centre the network, or verify a claim against it.</p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">{children}</div>;
}
