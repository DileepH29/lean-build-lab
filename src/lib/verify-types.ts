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
  provider: "OpenAlex" | "Crossref";
}

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
  evidenceScope: "abstract" | "none";
}

export type VerifyResponse = VerificationResult | { ok: false; error: string };

export const STATUS_META: Record<Status, { label: string; color: string; desc: string }> = {
  SUPPORTED: { label: "Supported", color: "supported", desc: "The source directly states this." },
  PARTIALLY_SUPPORTED: { label: "Partially supported", color: "partial", desc: "Some parts match; others overreach or lack context." },
  UNSUPPORTED: { label: "Unsupported", color: "unsupported", desc: "The available source text does not back this claim." },
  CONTRADICTED: { label: "Contradicted", color: "contradicted", desc: "The source states the opposite." },
  UNVERIFIABLE: { label: "Unverifiable", color: "unverifiable", desc: "Not enough accessible source text to judge." },
};

export function normalizeDoi(input: string): string {
  return input.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").trim();
}
