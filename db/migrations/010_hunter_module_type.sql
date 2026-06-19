-- Migration 010: Add module_type to Hunter tables
-- Extends investment_search_briefs and opportunity_sources with module_type
-- so that Rent, Buy, and other module-specific hunters can share the same tables.

-- 1. Extend investment_search_briefs
ALTER TABLE public.investment_search_briefs
  ADD COLUMN IF NOT EXISTS module_type text;

ALTER TABLE public.investment_search_briefs
  ADD COLUMN IF NOT EXISTS module_data jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'briefs_module_type_check'
  ) THEN
    ALTER TABLE public.investment_search_briefs
      ADD CONSTRAINT briefs_module_type_check
      CHECK (module_type IS NULL OR module_type IN (
        'invest', 'rent', 'buy', 'build', 'renovate',
        'airbnb', 'due-diligence', 'energy', 'portfolio'
      ));
  END IF;
END;
$$;

-- 2. Extend opportunity_sources
ALTER TABLE public.opportunity_sources
  ADD COLUMN IF NOT EXISTS module_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sources_module_type_check'
  ) THEN
    ALTER TABLE public.opportunity_sources
      ADD CONSTRAINT sources_module_type_check
      CHECK (module_type IS NULL OR module_type IN (
        'invest', 'rent', 'buy', 'build', 'renovate',
        'airbnb', 'due-diligence', 'energy', 'portfolio'
      ));
  END IF;
END;
$$;

-- 3. Indexes for module filtering
CREATE INDEX IF NOT EXISTS idx_briefs_module_type
  ON public.investment_search_briefs(organization_id, module_type);

CREATE INDEX IF NOT EXISTS idx_sources_module_type
  ON public.opportunity_sources(organization_id, module_type);

-- 4. Documentation
COMMENT ON COLUMN public.investment_search_briefs.module_type IS 'Which module owns this brief: invest, rent, buy, etc. NULL means invest (backward compat).';
COMMENT ON COLUMN public.investment_search_briefs.module_data IS 'Module-specific criteria as JSONB. Rent stores furnished, parking, bedrooms, etc.';
COMMENT ON COLUMN public.opportunity_sources.module_type IS 'Which module owns this source: invest, rent, buy, etc. NULL means invest (backward compat).';

-- 5. Backfill existing data: NULL module_type means invest (backward compatibility)
-- No UPDATE needed — NULL is treated as 'invest' by the application layer.