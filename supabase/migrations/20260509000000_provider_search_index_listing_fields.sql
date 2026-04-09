-- Domain 3.4 — Provider Discovery: add listing contact fields to search index.
-- These fields are populated by syncOrgToIndex() from organizations.metadata JSONB.
-- Allows discovery routes to read from provider_search_index without querying
-- the organizations table directly (Search Law compliance).

ALTER TABLE provider_search_index
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone   text,
  ADD COLUMN IF NOT EXISTS website text;
