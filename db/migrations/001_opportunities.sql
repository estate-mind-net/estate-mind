-- Migration: 001_opportunities
-- Creates the opportunities table used by the EstateMind service layer.
-- property and analysis are stored as JSONB to avoid a complex relational
-- schema at this stage. They can be normalised in a future migration.

CREATE TABLE IF NOT EXISTS opportunities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property    JSONB       NOT NULL,
  analysis    JSONB,
  status      TEXT        NOT NULL DEFAULT 'new-opportunity',
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  notes       TEXT        NOT NULL DEFAULT '',
  is_archived BOOLEAN     NOT NULL DEFAULT false,
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Efficient status-based filtering (tab views in OpportunityTracker)
CREATE INDEX IF NOT EXISTS opportunities_status_idx
  ON opportunities (status)
  WHERE is_archived = false;

-- Efficient archive/active split
CREATE INDEX IF NOT EXISTS opportunities_archived_idx
  ON opportunities (is_archived);

-- Default sort order (most recently updated first)
CREATE INDEX IF NOT EXISTS opportunities_updated_idx
  ON opportunities (updated_at DESC);

-- Trigger: keep updated_at current on every row update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS opportunities_set_updated_at ON opportunities;

CREATE TRIGGER opportunities_set_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
