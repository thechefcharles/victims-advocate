-- ORG-1A: Extend organizations + org_capabilities, org_profile_answers, org_custom_options,
-- org_profile_question_definitions (seed). RLS for org members and platform admins.
-- Note: service_types, languages, coverage_area, intake_methods, hours, accepting_clients,
-- avg_response_time_hours, capacity_status already exist from 20260317160000_org_profile_capabilities.sql.

alter table public.organizations
  add column if not exists ein text,
  add column if not exists compliance_profiles text[] not null default '{}',
  add column if not exists funding_sources text[] not null default '{}',
  add column if not exists states_of_operation text[] not null default '{}',
  add column if not exists profile_stage integer not null default 1
    check (profile_stage >= 1 and profile_stage <= 4),
  add column if not exists completeness_pct integer not null default 0
    check (completeness_pct >= 0 and completeness_pct <= 100),
  add column if not exists last_profile_update timestamptz,
  add column if not exists quality_tier text
    check (quality_tier is null or quality_tier in ('foundational', 'established', 'comprehensive')),
  add column if not exists tier_updated_at timestamptz,
  add column if not exists confidence_floor boolean not null default false;

comment on column public.organizations.profile_stage is 'Onboarding stage 1–4 (ORG-3 state machine).';
comment on column public.organizations.completeness_pct is 'Profile completeness 0–100 from org_profile_answers.';
comment on column public.organizations.last_profile_update is 'Last org profile field update (complements profile_last_updated_at).';
comment on column public.organizations.quality_tier is 'Denormalized tier cache: foundational / established / comprehensive.';

update public.organizations
set last_profile_update = profile_last_updated_at
where last_profile_update is null
  and profile_last_updated_at is not null;

-- ---------------------------------------------------------------------------
-- org_capabilities
-- ---------------------------------------------------------------------------
create table if not exists public.org_capabilities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  capability_key text not null,
  value text not null default '',
  confidence text not null default 'self_reported'
    check (confidence in ('self_reported', 'system', 'verified')),
  source text not null default ''
);

create index if not exists org_capabilities_org_key_idx
  on public.org_capabilities (organization_id, capability_key);
create index if not exists org_capabilities_org_created_idx
  on public.org_capabilities (organization_id, created_at desc);

comment on table public.org_capabilities is 'ORG-1A: Key/value capability signals per org (self-reported, system, verified).';

alter table public.org_capabilities enable row level security;

create policy "org_capabilities select org member or admin"
  on public.org_capabilities for select
  using (
    public.is_admin()
    or organization_id = public.current_org_id()
  );

create policy "org_capabilities insert org member or admin"
  on public.org_capabilities for insert
  with check (
    public.is_admin()
    or organization_id = public.current_org_id()
  );

create policy "org_capabilities update org member or admin"
  on public.org_capabilities for update
  using (
    public.is_admin()
    or organization_id = public.current_org_id()
  )
  with check (
    public.is_admin()
    or organization_id = public.current_org_id()
  );

create policy "org_capabilities delete org member or admin"
  on public.org_capabilities for delete
  using (
    public.is_admin()
    or organization_id = public.current_org_id()
  );

-- ---------------------------------------------------------------------------
-- org_profile_answers
-- ---------------------------------------------------------------------------
create table if not exists public.org_profile_answers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  section text not null,
  question_id text not null,
  selected_options text[] not null default '{}',
  custom_values text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  unique (organization_id, question_id)
);

create index if not exists org_profile_answers_org_section_idx
  on public.org_profile_answers (organization_id, section);

comment on table public.org_profile_answers is 'ORG-1A: Answers to org profile question definitions per org.';

alter table public.org_profile_answers enable row level security;

create policy "org_profile_answers select org member or admin"
  on public.org_profile_answers for select
  using (
    public.is_admin()
    or organization_id = public.current_org_id()
  );

create policy "org_profile_answers insert org member or admin"
  on public.org_profile_answers for insert
  with check (
    public.is_admin()
    or organization_id = public.current_org_id()
  );

create policy "org_profile_answers update org member or admin"
  on public.org_profile_answers for update
  using (
    public.is_admin()
    or organization_id = public.current_org_id()
  )
  with check (
    public.is_admin()
    or organization_id = public.current_org_id()
  );

create policy "org_profile_answers delete org member or admin"
  on public.org_profile_answers for delete
  using (
    public.is_admin()
    or organization_id = public.current_org_id()
  );

-- ---------------------------------------------------------------------------
-- org_custom_options (write-ins for admin review)
-- ---------------------------------------------------------------------------
create table if not exists public.org_custom_options (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  question_id text not null,
  value text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists org_custom_options_org_status_idx
  on public.org_custom_options (organization_id, status);
create index if not exists org_custom_options_pending_admin_idx
  on public.org_custom_options (status, created_at desc)
  where status = 'pending';

comment on table public.org_custom_options is 'ORG-1A: Write-in answers pending platform admin review.';

alter table public.org_custom_options enable row level security;

create policy "org_custom_options select org member or admin"
  on public.org_custom_options for select
  using (
    public.is_admin()
    or organization_id = public.current_org_id()
  );

create policy "org_custom_options insert org member or admin"
  on public.org_custom_options for insert
  with check (
    public.is_admin()
    or organization_id = public.current_org_id()
  );

create policy "org_custom_options update admin only"
  on public.org_custom_options for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "org_custom_options delete org member or admin"
  on public.org_custom_options for delete
  using (
    public.is_admin()
    or organization_id = public.current_org_id()
  );

-- ---------------------------------------------------------------------------
-- org_profile_question_definitions (global catalog)
-- ---------------------------------------------------------------------------
create table if not exists public.org_profile_question_definitions (
  question_id text primary key,
  section text not null,
  label text not null,
  type text not null
    check (type in ('single', 'multi', 'text', 'number')),
  gate text not null default 'optional'
    check (gate in ('hard', 'soft', 'optional')),
  preset_options jsonb not null default '[]'::jsonb,
  allows_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.org_profile_question_definitions is 'ORG-1A: Org profile intake question catalog; expand in ORG-3C.';

alter table public.org_profile_question_definitions enable row level security;

create policy "org_profile_question_definitions select authenticated"
  on public.org_profile_question_definitions for select
  to authenticated
  using (true);

create policy "org_profile_question_definitions admin write"
  on public.org_profile_question_definitions for all
  using (public.is_admin())
  with check (public.is_admin());

-- Minimal seed (full 43-question set in ORG-3C)
insert into public.org_profile_question_definitions
  (question_id, section, label, type, gate, preset_options, allows_custom)
values
  (
    'identity.org_type',
    'identity',
    'Organization type',
    'single',
    'hard',
    '["nonprofit","hospital","government","other"]'::jsonb,
    false
  ),
  (
    'identity.populations_served',
    'identity',
    'Populations served',
    'multi',
    'soft',
    '["survivors","children","elderly","immigrants","LGBTQ+","rural","urban"]'::jsonb,
    true
  ),
  (
    'staffing.volunteer_count',
    'staffing',
    'Approximate volunteer count',
    'number',
    'optional',
    '[]'::jsonb,
    false
  )
on conflict (question_id) do nothing;

-- ---------------------------------------------------------------------------
-- organizations: org members can update own org row (read was already allowed)
-- ---------------------------------------------------------------------------
drop policy if exists "Org members can update own org" on public.organizations;
create policy "Org members can update own org"
  on public.organizations for update
  using (
    exists (
      select 1
      from public.org_memberships m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.org_memberships m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );
