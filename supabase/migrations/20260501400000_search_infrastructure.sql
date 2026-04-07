-- Domain 0.6: Search Infrastructure (PostGIS)
--
-- Adds PostGIS extension and provider_search_index table.
-- provider_search_index is the ONLY table the search layer reads from (Search Law).
-- Only indexSync.ts (syncOrgToIndex) may populate this table from organizations.
--
-- Decisions:
--   Decision 3: Single merged table (no separate locations table).
--   Decision 4: approximate=true orgs stored but excluded from geo radius queries.
--   Decision 5: Visibility gate enforced by application code (canOrganizationAppearInSearch).
--   Decision 6: Coordinates derived by computeOrgMapPoint() before upsert.
--
-- search_vector note:
--   GENERATED ALWAYS AS fails for to_tsvector() because it is not marked IMMUTABLE
--   in PostgreSQL (the text search configuration can change at runtime).
--   Fix: plain tsvector column + BEFORE INSERT OR UPDATE trigger that computes it.
--   indexSync.ts does NOT set search_vector in the upsert payload; the trigger handles it.
--
-- PostGIS is not pre-installed on this Supabase project.
-- EXTENSION must come first — location column depends on it.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- provider_search_index
-- ---------------------------------------------------------------------------
-- Single denormalized table for all provider discovery queries.
-- search_vector: plain tsvector, populated by trigger on every upsert.
-- location: geography(Point,4326) for PostGIS ST_DWithin geo radius queries (GIST index).
-- approximate: true when coords come from state centroid fallback.
--   approximate orgs appear in text search but NOT in geo radius queries.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS provider_search_index (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

  -- Core identity
  name                 text NOT NULL,
  description          text,                          -- null in Domain 0.6; Domain 3.2 will populate

  -- Discovery tags (GIN-indexed for array containment)
  service_tags         text[]       NOT NULL DEFAULT '{}',
  state_codes          text[]       NOT NULL DEFAULT '{}',
  languages            text[]       NOT NULL DEFAULT '{}',

  -- Availability
  accepting_clients    boolean      NOT NULL DEFAULT false,
  capacity_status      text,

  -- Denormalized status fields (for admin filtering without joining organizations)
  lifecycle_status     text,
  public_profile_status text,
  profile_stage        text,

  -- Coordinates (materialized from computeOrgMapPoint 3-tier logic)
  lat                  double precision,
  lng                  double precision,
  location             geography(Point, 4326),        -- NULL when approximate=true
  approximate          boolean      NOT NULL DEFAULT false,

  -- Full-text search vector (set by trigger — do NOT set in application upsert)
  search_vector        tsvector,

  -- Index management
  is_active            boolean      NOT NULL DEFAULT true,
  last_synced_at       timestamptz  NOT NULL DEFAULT now(),
  created_at           timestamptz  NOT NULL DEFAULT now(),
  updated_at           timestamptz  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- search_vector trigger
-- ---------------------------------------------------------------------------
-- Computes to_tsvector('english', ...) from name, description, service_tags,
-- state_codes, and languages on every INSERT or UPDATE.
-- This is the correct approach: to_tsvector is STABLE (not IMMUTABLE) so it
-- cannot be used in GENERATED ALWAYS AS columns, but triggers have no such restriction.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION provider_search_index_set_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(array_to_string(NEW.service_tags, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.state_codes, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.languages, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_search_vector_update
  BEFORE INSERT OR UPDATE ON provider_search_index
  FOR EACH ROW EXECUTE FUNCTION provider_search_index_set_search_vector();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Full-text search (GIN on tsvector column — populated by trigger)
CREATE INDEX IF NOT EXISTS idx_search_vector
  ON provider_search_index USING GIN (search_vector);

-- Geo radius queries (GIST on geography column)
CREATE INDEX IF NOT EXISTS idx_search_location
  ON provider_search_index USING GIST (location);

-- Array containment filters
CREATE INDEX IF NOT EXISTS idx_search_service_tags
  ON provider_search_index USING GIN (service_tags);

CREATE INDEX IF NOT EXISTS idx_search_state_codes
  ON provider_search_index USING GIN (state_codes);

-- Selective index: only active rows (most queries filter is_active=true)
CREATE INDEX IF NOT EXISTS idx_search_is_active
  ON provider_search_index (is_active)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE provider_search_index ENABLE ROW LEVEL SECURITY;

-- Public read: authenticated and anonymous users may read active index rows.
-- This powers the provider directory (no auth required).
CREATE POLICY "search_index_public_read"
  ON provider_search_index
  FOR SELECT
  USING (is_active = true);

-- Service role writes: only server-side indexSync (service role) may upsert.
-- Anon and authenticated roles have no INSERT/UPDATE/DELETE access.
CREATE POLICY "search_index_service_write"
  ON provider_search_index
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
