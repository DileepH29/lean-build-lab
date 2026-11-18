export interface ExtractedPdf {
  title: string | null;
  author: string | null;
  pageCount: number;
  pages: string[];
  doi: string | null;
  thumbnail: string | null;
}

export const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** Browser-only: extracts per-page text, metadata, a DOI guess and a first-page thumbnail. */
export async function extractPdf(file: File, onProgress: (done: number, total: number) => void): Promise<ExtractedPdf> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const total = Math.min(doc.numPages, 300);
  const pages: string[] = [];
  let thumbnail: string | null = null;
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join("").slice(0, 20000));
    if (i === 1) {
      const vp = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement("canvas");
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
        thumbnail = canvas.toDataURL("image/jpeg", 0.7);
      }
    }
    onProgress(i, total);
  }
  const meta = (await doc.getMetadata().catch(() => null))?.info as { Title?: string; Author?: string } | undefined;
  const head = pages.slice(0, 2).join(" ");
  const doi = head.match(/\b(10\.\d{4,9}\/[^\s"<>]+[^\s"<>.,;)\]])/)?.[1] ?? null;
  return { title: meta?.Title?.trim() || null, author: meta?.Author?.trim() || null, pageCount: doc.numPages, pages, doi, thumbnail };
}
