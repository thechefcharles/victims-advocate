-- Phase 7: Case timeline events and internal case notes

-- Helper: can the current user view this case?
create or replace function public.can_view_case(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
  or exists (
    select 1 from public.case_access
    where case_id = p_case_id and user_id = auth.uid() and can_view = true
  );
$$;

-- Helper: can the current user view internal notes (not victim/owner)?
create or replace function public.can_view_internal_notes(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
  or exists (
    select 1 from public.case_access
    where case_id = p_case_id and user_id = auth.uid() and can_view = true and role != 'owner'
  );
$$;

-- 1) case_timeline_events
create table if not exists public.case_timeline_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid,
  actor_role text,
  event_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists case_timeline_events_case_created_idx
  on public.case_timeline_events (case_id, created_at desc);

create index if not exists case_timeline_events_org_created_idx
  on public.case_timeline_events (organization_id, created_at desc);

create index if not exists case_timeline_events_type_created_idx
  on public.case_timeline_events (event_type, created_at desc);

alter table public.case_timeline_events enable row level security;

create policy "Timeline readable by case viewers"
  on public.case_timeline_events for select
  using (
    (organization_id = public.current_org_id() or public.is_admin())
    and public.can_view_case(case_id)
  );

-- Insert/update/delete only via service role (server)
create policy "Timeline insert via service role"
  on public.case_timeline_events for insert
  with check (auth.role() = 'service_role');

create policy "Timeline no update delete"
  on public.case_timeline_events for update
  using (false);

create policy "Timeline no delete"
  on public.case_timeline_events for delete
  using (false);

-- 2) case_notes
create table if not exists public.case_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  author_user_id uuid not null,
  author_role text,
  content text not null,
  is_internal boolean not null default true,
  status text not null default 'active' check (status in ('active', 'edited', 'deleted')),
  edited_at timestamptz,
  edited_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);

create index if not exists case_notes_case_created_idx
  on public.case_notes (case_id, created_at desc);

create index if not exists case_notes_org_created_idx
  on public.case_notes (organization_id, created_at desc);

create index if not exists case_notes_author_created_idx
  on public.case_notes (author_user_id, created_at desc);

alter table public.case_notes enable row level security;

-- Only advocates/supervisors/org_admin/admin can read internal notes (not victims/owners)
create policy "Notes readable by non-owner case viewers"
  on public.case_notes for select
  using (
    (organization_id = public.current_org_id() or public.is_admin())
    and public.can_view_internal_notes(case_id)
    and status in ('active', 'edited')
  );

create policy "Notes insert by server or non-owner with access"
  on public.case_notes for insert
  with check (
    auth.role() = 'service_role'
    or ((organization_id = public.current_org_id() or public.is_admin()) and public.can_view_internal_notes(case_id))
  );

create policy "Notes update by server or author/elevated"
  on public.case_notes for update
  using (
    auth.role() = 'service_role'
    or ((organization_id = public.current_org_id() or public.is_admin()) and public.can_view_internal_notes(case_id))
  );

create policy "Notes delete by server or author/elevated"
  on public.case_notes for delete
  using (
    auth.role() = 'service_role'
    or ((organization_id = public.current_org_id() or public.is_admin()) and public.can_view_internal_notes(case_id))
  );
