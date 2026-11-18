import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeDoi } from "./verify-types";
import { verifyClaim } from "./verify.server";

const Input = z.object({
  claim: z.string().trim().min(10, "Claim is too short").max(1500),
  doi: z.string().trim().min(6).max(200).transform(normalizeDoi).refine((d) => /^10\.\d{4,9}\/\S+$/.test(d), "Enter a valid DOI like 10.1038/xxxx"),
});

export const runVerification = createServerFn({ method: "POST" })
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data }) => verifyClaim(data.claim, data.doi));
