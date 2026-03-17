-- Phase 11: Seed Illinois and Indiana compensation program definitions (conservative v1 rules).
-- Idempotent: remove existing seeded programs then insert.

delete from public.program_definitions
where program_key in ('illinois_vc', 'indiana_vc');

insert into public.program_definitions (
  program_key,
  name,
  description,
  state_code,
  scope_type,
  status,
  is_active,
  version,
  rule_set,
  required_documents,
  deadline_metadata,
  dependency_rules,
  stacking_rules,
  metadata
) values
(
  'illinois_vc',
  'Illinois Crime Victims Compensation',
  'Illinois CVC program for victims of violent crime. Eligibility depends on state residence, reporting, and loss types.',
  'IL',
  'state',
  'active',
  true,
  '1',
  '{
    "all": [
      { "field": "victim.state", "op": "eq", "value": "IL" }
    ],
    "any": [
      { "field": "crime.dateOfCrime", "op": "exists" },
      { "field": "losses.medicalHospital", "op": "eq", "value": true },
      { "field": "losses.counseling", "op": "eq", "value": true },
      { "field": "losses.funeralBurial", "op": "eq", "value": true },
      { "field": "losses.lossOfEarnings", "op": "eq", "value": true }
    ]
  }'::jsonb,
  '["Police report", "Medical/billing records", "Proof of loss"]'::jsonb,
  '{"summary": "File within 2 years of crime (or 2 years from minor turning 18). Extensions may apply."}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb
),
(
  'indiana_vc',
  'Indiana Crime Victims Compensation',
  'Indiana CVC program for victims of violent crime. Eligibility depends on state residence, reporting, and loss types.',
  'IN',
  'state',
  'active',
  true,
  '1',
  '{
    "all": [
      { "field": "victim.state", "op": "eq", "value": "IN" }
    ],
    "any": [
      { "field": "crime.dateOfCrime", "op": "exists" },
      { "field": "losses.medicalHospital", "op": "eq", "value": true },
      { "field": "losses.counseling", "op": "eq", "value": true },
      { "field": "losses.funeralBurial", "op": "eq", "value": true },
      { "field": "losses.lossOfEarnings", "op": "eq", "value": true }
    ]
  }'::jsonb,
  '["Police report", "Medical/billing records", "Proof of loss"]'::jsonb,
  '{"summary": "File within 2 years of crime. Extensions may apply."}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb
);
