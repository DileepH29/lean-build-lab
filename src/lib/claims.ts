import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { VerificationResult } from "./verify-types";

export interface VerificationRow {
  id: string;
  claim_id: string;
  status: string;
  confidence: number;
  evidence: string[];
  conflicts: string[];
  reasoning: string;
  limitations: string[];
  source: { title?: string; doi?: string; url?: string; year?: number | null; venue?: string | null; provider?: string; authors?: string[] };
  evidence_scope: string;
  created_at: string;
}
export interface ClaimRow {
  id: string;
  claim_text: string;
  doi: string;
  note: string | null;
  created_at: string;
  verifications: VerificationRow[];
}

export const claimsQuery = queryOptions({
  queryKey: ["claims"],
  queryFn: async (): Promise<ClaimRow[]> => {
    const { data, error } = await supabase
      .from("claims")
      .select("id, claim_text, doi, note, created_at, verifications(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as ClaimRow[]).map((c) => ({
      ...c,
      verifications: [...c.verifications].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    }));
  },
});

export async function createClaim(claim_text: string, doi: string, note?: string) {
  const { data, error } = await supabase.from("claims").insert({ claim_text, doi, note: note || null }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function saveVerification(claimId: string, r: VerificationResult) {
  const { abstract: _a, ...source } = r.source;
  const { error } = await supabase.from("verifications").insert({
    claim_id: claimId,
    status: r.status,
    confidence: r.confidence,
    evidence: r.evidence,
    conflicts: r.conflicts,
    reasoning: r.reasoning,
    limitations: r.limitations,
    source: { ...source, excerpts: r.excerpts } as unknown as Json,
    evidence_scope: r.evidenceScope,
  });
  if (error) throw error;
}
