CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  claim_text TEXT NOT NULL,
  doi TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own claims select" ON public.claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own claims insert" ON public.claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own claims update" ON public.claims FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own claims delete" ON public.claims FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX claims_user_idx ON public.claims (user_id, created_at DESC);

CREATE TABLE public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  status TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  conflicts JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasoning TEXT NOT NULL DEFAULT '',
  limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
  source JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_scope TEXT NOT NULL DEFAULT 'abstract',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verifications TO authenticated;
GRANT ALL ON public.verifications TO service_role;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own verifications select" ON public.verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own verifications insert" ON public.verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_id AND c.user_id = auth.uid()));
CREATE POLICY "Own verifications delete" ON public.verifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX verifications_user_idx ON public.verifications (user_id, created_at DESC);
CREATE INDEX verifications_claim_idx ON public.verifications (claim_id, created_at);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER claims_touch BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();