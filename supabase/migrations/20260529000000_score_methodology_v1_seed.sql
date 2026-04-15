-- Domain 6.1 — Seed the canonical v1.0 scoring methodology.
--
-- Publishes the Master System Document weights as the single active
-- methodology. aggregateScoreInputs reads this row to produce per-category
-- contributions, so without it the scoring pipeline has nothing to weight.
--
-- Schema notes (from migration 20260515000000_trust_scoring_domain.sql):
--   - name is NOT NULL          → supplied
--   - UNIQUE (version)          → ON CONFLICT target
--   - partial unique where status='active' enforces single-active
--   - category_definitions left at '[]' default (governed ChangeRequest in
--     Domain 7.1 can populate signal_types per category when the scoring
--     catalog is finalized)

INSERT INTO score_methodologies (
  version, name, status, weights, description, published_at
) VALUES (
  '1.0.0',
  'NxtStps v1.0 Canonical',
  'active',
  '{
    "response_accessibility": 0.25,
    "advocate_competency": 0.20,
    "case_outcomes": 0.20,
    "victim_experience": 0.15,
    "org_reliability": 0.10,
    "system_integration": 0.10
  }'::jsonb,
  'Canonical v1.0 weights per NxtStps 2.0 spec',
  now()
) ON CONFLICT (version) DO NOTHING;
