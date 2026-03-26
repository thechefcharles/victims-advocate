-- Phase 3: track when an org leader submitted public visibility for admin review.

alter table public.organizations
  add column if not exists activation_submitted_at timestamptz;

comment on column public.organizations.activation_submitted_at is
  'Timestamp when public_profile_status was set to pending_review for platform activation review.';
