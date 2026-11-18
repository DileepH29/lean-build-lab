import type { Excerpt } from "./verify-types";

const STOP = new Set("the and for that with this from were was are has have had been than their they which into also these those such using used use our its not but can may more most other some all any each between both after before over under about while there where when what who how why will would could should does did very only same per via within without upon based study studies paper results result show shows shown found".split(" "));

export function terms(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9][a-z0-9.%\-]*/g) ?? [])
    .map((w) => w.replace(/[.\-]+$/, ""))
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Pick the passages of a document most relevant to a claim (lexical overlap, numbers weighted). */
export function selectPassages(claim: string, pages: string[], k = 6): Excerpt[] {
  const want = new Map<string, number>();
  for (const t of terms(claim)) want.set(t, /\d/.test(t) ? 3 : 1);
  const windows: { page: number; text: string; score: number }[] = [];
  pages.forEach((raw, i) => {
    const text = raw.replace(/\s+/g, " ").trim();
    if (!text) return;
    const sents = text.split(/(?<=[.!?])\s+(?=[A-Z0-9(])/);
    for (let s = 0; s < sents.length; s += 2) {
      const win = sents.slice(s, s + 3).join(" ");
      if (win.length < 40) continue;
      const have = new Set(terms(win));
      let score = 0;
      for (const [t, w] of want) if (have.has(t)) score += w;
      windows.push({ page: i + 1, text: win.slice(0, 1200), score: score / Math.sqrt(Math.max(have.size, 8)) });
    }
  });
  const top = windows.filter((w) => w.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
  const first = windows.find((w) => w.page === 1);
  if (first && !top.includes(first)) top.push(first);
  return top.sort((a, b) => a.page - b.page).map((w) => ({ label: `Page ${w.page}`, text: w.text }));
}
