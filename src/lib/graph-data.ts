export type NodeKind = "center" | "reference" | "citing" | "claim";
export interface GNode {
  id: string;
  kind: NodeKind;
  title: string;
  year: number | null;
  cited: number;
  doi: string | null;
  status?: string;
}
export interface GEdge { a: string; b: string; kind: "cites" | "claim" }
export interface GraphData { center: GNode; nodes: GNode[]; edges: GEdge[] }

const SEL = "id,title,display_name,publication_year,cited_by_count,doi,referenced_works";
const short = (u: string) => u.replace("https://openalex.org/", "");
type W = { id: string; title?: string; display_name?: string; publication_year?: number; cited_by_count?: number; doi?: string | null; referenced_works?: string[] };
const toNode = (w: W, kind: NodeKind): GNode => ({
  id: short(w.id),
  kind,
  title: w.title ?? w.display_name ?? "Untitled",
  year: w.publication_year ?? null,
  cited: w.cited_by_count ?? 0,
  doi: w.doi ? w.doi.replace(/^https?:\/\/doi\.org\//, "") : null,
});

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (r.status === 404) throw new Error("not_found");
  if (!r.ok) throw new Error("unavailable");
  return r.json();
}

/** Builds a real citation neighbourhood from OpenAlex: references (what it cites) and top citing works. */
export async function loadGraph(doi: string): Promise<GraphData> {
  const w = await get<W>(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}?select=${SEL}`);
  const center = toNode(w, "center");
  const refIds = (w.referenced_works ?? []).slice(0, 30).map(short);
  const [refs, citing] = await Promise.all([
    refIds.length
      ? get<{ results: W[] }>(`https://api.openalex.org/works?filter=openalex_id:${refIds.join("|")}&select=${SEL}&per-page=30`).then((r) => r.results)
      : Promise.resolve([] as W[]),
    get<{ results: W[] }>(`https://api.openalex.org/works?filter=cites:${center.id}&sort=cited_by_count:desc&select=${SEL}&per-page=20`).then((r) => r.results),
  ]);
  const nodes: GNode[] = [center, ...refs.map((r) => toNode(r, "reference")), ...citing.map((c) => toNode(c, "citing"))];
  const ids = new Set(nodes.map((n) => n.id));
  const edges: GEdge[] = [];
  const seen = new Set<string>();
  const add = (a: string, b: string) => { const k = `${a}>${b}`; if (a !== b && !seen.has(k) && ids.has(a) && ids.has(b)) { seen.add(k); edges.push({ a, b, kind: "cites" }); } };
  refs.forEach((r) => add(center.id, short(r.id)));
  citing.forEach((c) => add(short(c.id), center.id));
  // Cross-links: real citations among the neighbourhood itself.
  [...refs, ...citing].forEach((x) => (x.referenced_works ?? []).forEach((t) => add(short(x.id), short(t))));
  return { center, nodes, edges };
}
