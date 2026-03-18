-- Phase 1: Immutable audit_log table for platform-wide audit events.
-- Run in Supabase SQL Editor or via: supabase db push

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid,
  actor_role text,
  organization_id uuid,
  action text not null,
  resource_type text,
  resource_id uuid,
  ip inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  metadata_hash text,
  severity text not null default 'info' check (severity in ('info', 'warning', 'security')),
  is_immutable boolean not null default true
);

comment on table public.audit_log is 'Append-only audit log for identity and security events. Phase 1.';

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_user_id_created_at_idx on public.audit_log (actor_user_id, created_at desc);
create index if not exists audit_log_organization_id_created_at_idx on public.audit_log (organization_id, created_at desc);
create index if not exists audit_log_action_created_at_idx on public.audit_log (action, created_at desc);
create index if not exists audit_log_resource_created_at_idx on public.audit_log (resource_type, resource_id, created_at desc);

alter table public.audit_log enable row level security;

-- Insert: service role only (server uses getSupabaseAdmin for inserts).
create policy "Service role can insert audit_log"
  on public.audit_log for insert
  with check (auth.role() = 'service_role');

-- Select: no policy for authenticated/anon = they cannot read audit_log via PostgREST.
-- Admin UI uses the server (service_role), which bypasses RLS. Avoids requiring public.profiles
-- to exist before this migration runs.

-- Auth signup is logged via API (POST /api/audit/log-auth-event) after client signup.
