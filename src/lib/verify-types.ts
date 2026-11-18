export const STATUSES = ["SUPPORTED", "PARTIALLY_SUPPORTED", "UNSUPPORTED", "CONTRADICTED", "UNVERIFIABLE"] as const;
export type Status = (typeof STATUSES)[number];

export interface SourceRecord {
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  doi: string;
  url: string;
  abstract: string | null;
  isRetracted: boolean;
  provider: "OpenAlex" | "Crossref" | "Uploaded PDF";
}

export interface Excerpt {
  label: string;
  text: string;
}

export type EvidenceScope = "abstract" | "full_text" | "none";

export interface VerificationResult {
  ok: true;
  claim: string;
  source: SourceRecord;
  status: Status;
  confidence: number;
  evidence: string[];
  conflicts: string[];
  reasoning: string;
  limitations: string[];
  excerpts: Excerpt[];
  evidenceScope: EvidenceScope;
}

export type VerifyResponse = VerificationResult | { ok: false; error: string };

export const STATUS_META: Record<Status, { label: string; color: string; desc: string }> = {
  SUPPORTED: { label: "Supported", color: "supported", desc: "The source directly states this." },
  PARTIALLY_SUPPORTED: { label: "Partially supported", color: "partial", desc: "Some parts match; others overreach or lack context." },
  UNSUPPORTED: { label: "Unsupported", color: "unsupported", desc: "The available source text does not back this claim." },
  CONTRADICTED: { label: "Contradicted", color: "contradicted", desc: "The source states the opposite." },
  UNVERIFIABLE: { label: "Unverifiable", color: "unverifiable", desc: "Not enough accessible source text to judge." },
};

export const STATUS_STYLES: Record<string, string> = {
  supported: "border-supported/40 bg-supported/10 text-supported",
  partial: "border-partial/40 bg-partial/10 text-partial",
  unsupported: "border-unsupported/40 bg-unsupported/10 text-unsupported",
  contradicted: "border-contradicted/40 bg-contradicted/10 text-contradicted",
  unverifiable: "border-unverifiable/40 bg-unverifiable/10 text-unverifiable",
};

export function statusMeta(s: string) {
  return STATUS_META[(STATUSES as readonly string[]).includes(s) ? (s as Status) : "UNVERIFIABLE"];
}

export function normalizeDoi(input: string): string {
  return input.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").trim();
}

export const DOI_RE = /^10\.\d{4,9}\/\S+$/;

/**
 * Citation integrity score: share of judged verdicts that hold up.
 * Supported = 1, partially supported = 0.5, unsupported/contradicted = 0.
 * Unverifiable verdicts are excluded because there was no evidence to judge.
 */
export function integrityScore(statuses: string[]): number | null {
  const judged = statuses.filter((s) => s !== "UNVERIFIABLE");
  if (!judged.length) return null;
  const pts = judged.reduce((a, s) => a + (s === "SUPPORTED" ? 1 : s === "PARTIALLY_SUPPORTED" ? 0.5 : 0), 0);
  return Math.round((pts / judged.length) * 100);
}
