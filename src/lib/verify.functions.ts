import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DOI_RE, normalizeDoi } from "./verify-types";
import { verifyClaim, verifyClaimAgainstPdf } from "./verify.server";

const Doi = z.string().trim().max(200).transform(normalizeDoi).refine((d) => DOI_RE.test(d), "Enter a valid DOI like 10.1038/xxxx");

const Input = z
  .object({
    claim: z.string().trim().min(10, "Claim is too short").max(1500),
    doi: z.union([Doi, z.literal("").transform(() => undefined)]).optional(),
    pdf: z.object({ title: z.string().max(500).optional(), pages: z.array(z.string().max(20000)).min(1).max(300) }).optional(),
  })
  .refine((d) => d.doi || d.pdf, "Provide a DOI or upload a PDF");

export const runVerification = createServerFn({ method: "POST" })
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data }) => (data.pdf ? verifyClaimAgainstPdf(data.claim, data.doi, data.pdf) : verifyClaim(data.claim, data.doi!)));
