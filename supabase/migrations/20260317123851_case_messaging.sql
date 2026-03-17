-- Phase 15: Secure messaging v1 (case-based communication)

-- 1) case_conversations (one per case is acceptable for v1)
create table if not exists public.case_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'closed', 'archived'))
);

create unique index if not exists case_conversations_case_unique
  on public.case_conversations (case_id);
create index if not exists case_conversations_org_idx
  on public.case_conversations (organization_id);
create index if not exists case_conversations_updated_idx
  on public.case_conversations (updated_at desc);

alter table public.case_conversations enable row level security;

drop policy if exists "Case conversations org/case select" on public.case_conversations;
create policy "Case conversations org/case select"
  on public.case_conversations for select
  using (
    (organization_id = public.current_org_id() or public.is_admin())
    and exists (
      select 1 from public.case_access ca
      where ca.case_id = case_conversations.case_id
        and ca.organization_id = case_conversations.organization_id
        and ca.user_id = auth.uid()
        and ca.can_view = true
    )
  );

drop policy if exists "Case conversations service role all" on public.case_conversations;
create policy "Case conversations service role all"
  on public.case_conversations for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 2) case_messages
create table if not exists public.case_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  conversation_id uuid not null references public.case_conversations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  sender_user_id uuid not null references auth.users(id) on delete restrict,
  sender_role text,
  message_text text not null,
  status text not null default 'sent' check (status in ('sent', 'edited', 'deleted')),
  edited_at timestamptz,
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists case_messages_conversation_created_idx
  on public.case_messages (conversation_id, created_at desc);
create index if not exists case_messages_case_created_idx
  on public.case_messages (case_id, created_at desc);
create index if not exists case_messages_org_idx
  on public.case_messages (organization_id);

alter table public.case_messages enable row level security;

drop policy if exists "Case messages org/case select" on public.case_messages;
create policy "Case messages org/case select"
  on public.case_messages for select
  using (
    (organization_id = public.current_org_id() or public.is_admin())
    and exists (
      select 1 from public.case_access ca
      where ca.case_id = case_messages.case_id
        and ca.organization_id = case_messages.organization_id
        and ca.user_id = auth.uid()
        and ca.can_view = true
    )
  );

drop policy if exists "Case messages service role all" on public.case_messages;
create policy "Case messages service role all"
  on public.case_messages for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 3) message_reads (read receipts)
create table if not exists public.message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.case_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now()
);

create unique index if not exists message_reads_message_user_unique
  on public.message_reads (message_id, user_id);

alter table public.message_reads enable row level security;

drop policy if exists "Message reads self select" on public.message_reads;
create policy "Message reads self select"
  on public.message_reads for select
  using (user_id = auth.uid());

drop policy if exists "Message reads service role all" on public.message_reads;
create policy "Message reads service role all"
  on public.message_reads for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

