-- Migration 011: Brief-Source bridge table
-- Enables assigning specific sources to specific briefs
-- so discovery runs only process relevant pairings.

CREATE TABLE IF NOT EXISTS public.brief_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL,
  source_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT brief_sources_pkey PRIMARY KEY (id),
  CONSTRAINT brief_sources_brief_id_fkey FOREIGN KEY (brief_id)
    REFERENCES public.investment_search_briefs(id) ON DELETE CASCADE,
  CONSTRAINT brief_sources_source_id_fkey FOREIGN KEY (source_id)
    REFERENCES public.opportunity_sources(id) ON DELETE CASCADE,
  CONSTRAINT brief_sources_unique UNIQUE (brief_id, source_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brief_sources_brief_id
  ON public.brief_sources(brief_id);

CREATE INDEX IF NOT EXISTS idx_brief_sources_source_id
  ON public.brief_sources(source_id);

-- RLS: inherit from organization via brief
ALTER TABLE public.brief_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY brief_sources_org_isolation ON public.brief_sources
  FOR ALL
  USING (
    brief_id IN (
      SELECT id FROM public.investment_search_briefs
      WHERE organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

COMMENT ON TABLE public.brief_sources IS 'M:N bridge between briefs and sources. A brief uses specific sources for discovery.';
COMMENT ON COLUMN public.brief_sources.brief_id IS 'The brief that uses this source.';
COMMENT ON COLUMN public.brief_sources.source_id IS 'The source assigned to this brief.';