import { useRef, useState } from "react";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { extractPdf, MAX_PDF_BYTES, type ExtractedPdf } from "@/lib/pdf-extract";

export function PdfDrop({ value, onChange }: { value: (ExtractedPdf & { name: string }) | null; onChange: (v: (ExtractedPdf & { name: string }) | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setError("Please choose a PDF file.");
    if (file.size > MAX_PDF_BYTES) return setError("PDF is larger than 25 MB.");
    setProgress({ done: 0, total: 1 });
    try {
      const out = await extractPdf(file, (done, total) => setProgress({ done, total }));
      if (!out.pages.join("").trim()) setError("No selectable text found — this looks like a scanned PDF.");
      onChange({ ...out, name: file.name });
    } catch (e) {
      console.error(e);
      setError("This PDF couldn't be read.");
    } finally {
      setProgress(null);
    }
  }

  if (progress) {
    const pct = Math.round((progress.done / progress.total) * 100);
    return (
      <div className="rounded-xl border p-4">
        <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Reading page {progress.done} of {progress.total}…</div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
      </div>
    );
  }

  if (value) {
    return (
      <div className="flex gap-3 rounded-xl border p-3">
        {value.thumbnail ? <img src={value.thumbnail} alt="First page preview" className="h-24 w-[72px] rounded object-cover object-top" /> : <FileText className="h-10 w-10 text-primary" />}
        <div className="min-w-0 flex-1 text-xs">
          <p className="truncate text-sm font-medium">{value.title || value.name}</p>
          {value.author && <p className="truncate text-muted-foreground">{value.author}</p>}
          <p className="mt-1 text-muted-foreground">{value.pageCount} pages · {Math.round(value.pages.join(" ").length / 1000)}k characters</p>
          {value.doi && <p className="mt-1 font-mono text-primary">DOI found: {value.doi}</p>}
          {error && <p className="mt-1 text-destructive">{error}</p>}
        </div>
        <button type="button" onClick={() => onChange(null)} aria-label="Remove PDF" className="self-start text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
        className={`flex w-full flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-sm transition-colors ${drag ? "border-primary bg-primary/5" : "hover:border-primary/60"}`}
      >
        <UploadCloud className="h-6 w-6 text-primary" />
        <span>Drop the cited paper's PDF here or <span className="text-primary">browse</span></span>
        <span className="text-xs text-muted-foreground">Text-based PDFs up to 25 MB · read in your browser</span>
      </button>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
