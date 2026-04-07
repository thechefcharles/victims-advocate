-- Domain 1.4 — Documents + Consent schema migration.
-- Timestamp: 20260502200000 (> 20260501400000, Rule 13).
-- SOC 2 gate: all RLS policies, audit columns, and consent tables are mandatory.

-- ============================================================================
-- 1. Add missing columns to documents table
-- ============================================================================

alter table public.documents
  add column if not exists linked_object_type text,
  add column if not exists linked_object_id uuid,
  add column if not exists locked_at timestamptz,
  add column if not exists archived_at timestamptz;

-- ============================================================================
-- 2. Backfill linked_object for existing case-linked documents
-- ============================================================================

update public.documents
  set linked_object_type = 'case', linked_object_id = case_id
  where case_id is not null and linked_object_id is null;

-- ============================================================================
-- 3. Update status CHECK to include locked and archived (additive — no data migration needed)
-- ============================================================================

alter table public.documents
  drop constraint if exists documents_status_check;

alter table public.documents
  add constraint documents_status_check
  check (status in ('active', 'deleted', 'restricted', 'locked', 'archived'));

-- ============================================================================
-- 4. Add applicant own-document RLS policy (SOC 2 required — applicants were blocked)
-- ============================================================================

drop policy if exists "applicant_own_documents_select" on public.documents;
create policy "applicant_own_documents_select"
  on public.documents for select
  using (uploaded_by_user_id = auth.uid());

-- ============================================================================
-- 5. Create document_versions table (append-only version history)
-- ============================================================================

create table if not exists public.document_versions (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references public.documents(id) on delete cascade,
  storage_path  text not null,
  file_name     text not null,
  file_size     bigint,
  mime_type     text,
  version_number integer not null default 1,
  replaced_at   timestamptz not null default now(),
  replaced_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table public.document_versions enable row level security;

drop policy if exists "document_versions_org_select" on public.document_versions;
create policy "document_versions_org_select"
  on public.document_versions for select
  using (
    exists (
      select 1 from public.documents d
        where d.id = document_versions.document_id
          and (d.organization_id = public.current_org_id() or public.is_admin())
    )
  );

drop policy if exists "document_versions_applicant_select" on public.document_versions;
create policy "document_versions_applicant_select"
  on public.document_versions for select
  using (
    exists (
      select 1 from public.documents d
        where d.id = document_versions.document_id
          and d.uploaded_by_user_id = auth.uid()
    )
  );

drop policy if exists "service_role_document_versions" on public.document_versions;
create policy "service_role_document_versions"
  on public.document_versions for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- 6. Create consent_grants table (Class A — Restricted)
-- ============================================================================

create table if not exists public.consent_grants (
  id               uuid primary key default gen_random_uuid(),
  applicant_id     uuid not null references auth.users(id) on delete restrict,
  granted_to_type  text not null check (granted_to_type in ('organization', 'agency', 'platform_admin')),
  granted_to_id    uuid not null,
  purpose_code     text not null,
  status           text not null default 'active'
                     check (status in ('active', 'revoked', 'expired')),
  effective_at     timestamptz not null default now(),
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),
  revoked_at       timestamptz,
  revoked_by       uuid references auth.users(id) on delete set null,
  created_by       uuid references auth.users(id) on delete set null
);

alter table public.consent_grants enable row level security;

drop policy if exists "consent_grants_applicant_own" on public.consent_grants;
create policy "consent_grants_applicant_own"
  on public.consent_grants for all
  using (applicant_id = auth.uid());

drop policy if exists "consent_grants_provider_read" on public.consent_grants;
create policy "consent_grants_provider_read"
  on public.consent_grants for select
  using (
    granted_to_type = 'organization'
    and granted_to_id = public.current_org_id()
    and status = 'active'
  );

drop policy if exists "consent_grants_admin" on public.consent_grants;
create policy "consent_grants_admin"
  on public.consent_grants for select
  using (public.is_admin());

drop policy if exists "consent_grants_service_role" on public.consent_grants;
create policy "consent_grants_service_role"
  on public.consent_grants for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- 7. Create consent_scopes table
-- ============================================================================

create table if not exists public.consent_scopes (
  id                  uuid primary key default gen_random_uuid(),
  grant_id            uuid not null references public.consent_grants(id) on delete cascade,
  linked_object_type  text not null check (linked_object_type in ('case', 'support_request', 'referral')),
  linked_object_id    uuid not null,
  doc_types_covered   text[],  -- null = all document types covered
  created_at          timestamptz not null default now()
);

alter table public.consent_scopes enable row level security;

drop policy if exists "consent_scopes_via_grant" on public.consent_scopes;
create policy "consent_scopes_via_grant"
  on public.consent_scopes for select
  using (
    exists (
      select 1 from public.consent_grants cg
        where cg.id = consent_scopes.grant_id
          and (
            cg.applicant_id = auth.uid()
            or (cg.granted_to_type = 'organization' and cg.granted_to_id = public.current_org_id())
            or public.is_admin()
          )
    )
  );

drop policy if exists "consent_scopes_service_role" on public.consent_scopes;
create policy "consent_scopes_service_role"
  on public.consent_scopes for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- 8. Create consent_revocations table (append-only audit trail)
-- ============================================================================

create table if not exists public.consent_revocations (
  id          uuid primary key default gen_random_uuid(),
  grant_id    uuid not null references public.consent_grants(id) on delete cascade,
  revoked_by  uuid not null references auth.users(id) on delete restrict,
  reason      text,
  revoked_at  timestamptz not null default now()
);

alter table public.consent_revocations enable row level security;

drop policy if exists "consent_revocations_applicant_own" on public.consent_revocations;
create policy "consent_revocations_applicant_own"
  on public.consent_revocations for select
  using (
    exists (
      select 1 from public.consent_grants cg
        where cg.id = consent_revocations.grant_id
          and cg.applicant_id = auth.uid()
    )
  );

drop policy if exists "consent_revocations_service_role" on public.consent_revocations;
create policy "consent_revocations_service_role"
  on public.consent_revocations for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- 9. Indexes
-- ============================================================================

create index if not exists documents_linked_object_idx
  on public.documents (linked_object_type, linked_object_id)
  where linked_object_id is not null;

create index if not exists consent_grants_applicant_idx
  on public.consent_grants (applicant_id, status);

create index if not exists consent_grants_recipient_idx
  on public.consent_grants (granted_to_type, granted_to_id, status);

create index if not exists consent_scopes_grant_idx
  on public.consent_scopes (grant_id, linked_object_id);

-- ============================================================================
-- Comments
-- ============================================================================

comment on table public.consent_grants is
  'Domain 1.4: Class A data. Explicit, scoped, revocable data-sharing consent grants. VOCA/VAWA enforcement mechanism.';

comment on table public.consent_revocations is
  'Domain 1.4: Append-only audit trail of consent revocations. Never delete rows.';

comment on column public.documents.linked_object_type is
  'Domain 1.4: polymorphic workflow linkage. Values: case, support_request, referral.';

comment on column public.documents.locked_at is
  'Domain 1.4: timestamp when document was locked (immutable). Null = not locked.';
