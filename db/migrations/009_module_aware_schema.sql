-- Migration 009: Module-aware schema
-- Adds module_type and module_data to properties and opportunities
-- so that Rent, Buy, Airbnb, and other modules share the same tables.

-- 1. Extend properties table
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS module_type text NOT NULL DEFAULT 'invest';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_module_type_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_module_type_check
      CHECK (module_type IN (
        'invest', 'rent', 'buy', 'build', 'renovate',
        'airbnb', 'due-diligence', 'energy', 'portfolio'
      ));
  END IF;
END;
$$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS module_data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Extend opportunities table
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS module_type text NOT NULL DEFAULT 'invest';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'opportunities_module_type_check'
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT opportunities_module_type_check
      CHECK (module_type IN (
        'invest', 'rent', 'buy', 'build', 'renovate',
        'airbnb', 'due-diligence', 'energy', 'portfolio'
      ));
  END IF;
END;
$$;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS module_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS contact_name text;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS contact_phone text;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS next_action text;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

-- 3. Indexes for module filtering
CREATE INDEX IF NOT EXISTS idx_properties_module_type
  ON public.properties(organization_id, module_type);

CREATE INDEX IF NOT EXISTS idx_opportunities_module_type
  ON public.opportunities(organization_id, module_type);

CREATE INDEX IF NOT EXISTS idx_opportunities_module_stage
  ON public.opportunities(organization_id, module_type, stage);

-- 4. Comment for documentation
COMMENT ON COLUMN public.properties.module_type IS 'Which module owns this property: invest, rent, buy, build, renovate, airbnb, due-diligence, energy, portfolio';
COMMENT ON COLUMN public.properties.module_data IS 'Module-specific data as JSONB. Each module can store its own fields here without schema changes.';
COMMENT ON COLUMN public.opportunities.module_type IS 'Which module owns this opportunity: invest, rent, buy, build, renovate, airbnb, due-diligence, energy, portfolio';
COMMENT ON COLUMN public.opportunities.module_data IS 'Module-specific data as JSONB. Each module can store its own fields here without schema changes.';
COMMENT ON COLUMN public.opportunities.contact_name IS 'Contact person name (landlord, agent, etc.)';
COMMENT ON COLUMN public.opportunities.contact_phone IS 'Contact phone number';
COMMENT ON COLUMN public.opportunities.next_action IS 'Next planned action for this opportunity';
COMMENT ON COLUMN public.opportunities.viewed_at IS 'Timestamp when the property was physically viewed';