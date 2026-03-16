-- Phase 6: Document status lifecycle and soft-delete / restrict for survivor-safe handling

-- Ensure columns exist (idempotent)
alter table public.documents
  add column if not exists status text not null default 'active'
  check (status in ('active', 'deleted', 'restricted'));

alter table public.documents
  add column if not exists deleted_at timestamptz;

alter table public.documents
  add column if not exists deleted_by uuid;

alter table public.documents
  add column if not exists restricted_at timestamptz;

alter table public.documents
  add column if not exists restricted_by uuid;

alter table public.documents
  add column if not exists restriction_reason text;

-- Backfill status for existing rows (in case default didn't apply)
update public.documents
set status = 'active'
where status is null or status = '';

create index if not exists documents_status_idx
  on public.documents (status);

create index if not exists documents_case_status_idx
  on public.documents (case_id, status)
  where case_id is not null;
