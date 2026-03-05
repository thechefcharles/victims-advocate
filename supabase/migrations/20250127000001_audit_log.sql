-- Phase 1: Immutable audit_log table for platform-wide audit events.
-- Run in Supabase SQL Editor or via: supabase db push

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid nullable,
  actor_role text nullable,
  organization_id uuid nullable,
  action text not null,
  resource_type text nullable,
  resource_id uuid nullable,
  ip inet nullable,
  user_agent text nullable,
  metadata jsonb not null default '{}'::jsonb,
  metadata_hash text nullable,
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

-- Select: admin-only for Phase 1. Phase 2 will add org-scoped read.
create policy "Admin can read audit_log"
  on public.audit_log for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Auth signup is logged via API (POST /api/audit/log-auth-event) after client signup.
