-- Phase 4: Versioned policy documents and append-only acceptances

-- policy_documents
create table if not exists public.policy_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  doc_type text not null check (doc_type in (
    'terms_of_use',
    'privacy_policy',
    'ai_disclaimer',
    'non_legal_advice'
  )),
  version text not null,
  title text not null,
  content text not null,
  is_active boolean not null default false,
  applies_to_role text check (applies_to_role is null or applies_to_role in ('victim', 'advocate', 'admin')),
  workflow_key text,
  created_by uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists policy_documents_doc_type_active_idx
  on public.policy_documents (doc_type, is_active);

create index if not exists policy_documents_workflow_active_idx
  on public.policy_documents (workflow_key, is_active);

create index if not exists policy_documents_created_at_idx
  on public.policy_documents (created_at desc);

-- Only one active version per (doc_type, applies_to_role, workflow_key)
create unique index if not exists policy_documents_one_active_per_slot_idx
  on public.policy_documents (
    doc_type,
    coalesce(applies_to_role, ''),
    coalesce(workflow_key, '')
  )
  where is_active = true;

-- policy_acceptances (append-only)
create table if not exists public.policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null,
  policy_document_id uuid not null references public.policy_documents(id) on delete cascade,
  doc_type text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  role_at_acceptance text,
  workflow_key text,
  ip inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists policy_acceptances_user_doc_accepted_idx
  on public.policy_acceptances (user_id, doc_type, accepted_at desc);

create index if not exists policy_acceptances_user_policy_idx
  on public.policy_acceptances (user_id, policy_document_id);

create index if not exists policy_acceptances_doc_version_idx
  on public.policy_acceptances (doc_type, version);

alter table public.policy_documents enable row level security;
alter table public.policy_acceptances enable row level security;

-- policy_documents: admin manage; others can read active only (for display)
create policy "Admin can manage policy_documents"
  on public.policy_documents for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Anyone authenticated can read active policy_documents"
  on public.policy_documents for select
  using (is_active = true);

-- policy_acceptances: user reads own; inserts via server only (service role)
create policy "Users can read own acceptances"
  on public.policy_acceptances for select
  using (user_id = auth.uid());

create policy "Admin can read all acceptances"
  on public.policy_acceptances for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Allow authenticated insert for recording acceptance (server will use service role; anon key needs insert for RPC or we use API only)
-- No policy for insert = only service_role can insert (API uses getSupabaseAdmin()). Good.
