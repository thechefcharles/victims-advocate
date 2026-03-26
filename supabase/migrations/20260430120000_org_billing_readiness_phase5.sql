-- Phase 5: Billing-readiness scaffolding only. App remains free; no Stripe, no paywalls.
-- organizations = future billing/customer entity; simple owner-tier membership = future billing authority.

alter table public.organizations
  add column if not exists billing_plan_key text not null default 'free',
  add column if not exists billing_status text not null default 'not_applicable';

comment on column public.organizations.billing_plan_key is
  'Product plan id for future paid tiers (default free). Not enforced in application code in Phase 5.';
comment on column public.organizations.billing_status is
  'Future subscription/payment lifecycle (e.g. not_applicable, active, past_due). Reserved; no gating yet.';
