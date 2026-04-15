-- Domain 0.6 — Search Infrastructure: geo radius RPC
--
-- Exposes a server-side geo query against provider_search_index using PostGIS
-- ST_DWithin / ST_Distance. Fronted by Supabase .rpc() so the application layer
-- never issues raw ST_ SQL and the frontend never receives unfiltered coordinate
-- lists for client-side filtering.
--
-- Decisions:
--   - Approximate rows (location IS NULL) are excluded from geo radius results.
--     They remain visible in non-geo listings.
--   - is_active=true gate is enforced here, matching the Search Law.
--   - distance_meters is computed by PostGIS and sorted asc. Callers convert to
--     miles in the serializer if needed.
--   - Default radius is 80km (~50mi). Caller may override.

CREATE OR REPLACE FUNCTION search_providers_near(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision DEFAULT 80000,
  p_limit integer DEFAULT 500
)
RETURNS TABLE (
  org_id uuid,
  name text,
  state_codes text[],
  accepting_clients boolean,
  capacity_status text,
  approximate boolean,
  lat double precision,
  lng double precision,
  address text,
  phone text,
  website text,
  distance_meters double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    s.org_id,
    s.name,
    s.state_codes,
    s.accepting_clients,
    s.capacity_status,
    s.approximate,
    s.lat,
    s.lng,
    s.address,
    s.phone,
    s.website,
    ST_Distance(s.location, ST_MakePoint(p_lng, p_lat)::geography) AS distance_meters
  FROM provider_search_index s
  WHERE s.is_active = true
    AND s.location IS NOT NULL
    AND ST_DWithin(s.location, ST_MakePoint(p_lng, p_lat)::geography, p_radius_meters)
  ORDER BY distance_meters ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION search_providers_near(double precision, double precision, double precision, integer)
  TO anon, authenticated, service_role;
