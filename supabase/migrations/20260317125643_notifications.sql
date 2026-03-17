-- Phase 16: Notifications engine v1 (in-app first)

-- notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  case_id uuid references public.cases(id) on delete cascade,
  type text not null,
  channel text not null default 'in_app' check (channel in ('in_app','email','sms')),
  status text not null default 'pending' check (status in ('pending','delivered','read','dismissed','failed')),
  title text not null,
  body text,
  action_url text,
  preview_safe boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  dismissed_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_reason text
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_status_created_idx
  on public.notifications (user_id, status, created_at desc);
create index if not exists notifications_org_created_idx
  on public.notifications (organization_id, created_at desc);
create index if not exists notifications_case_created_idx
  on public.notifications (case_id, created_at desc);
create index if not exists notifications_type_created_idx
  on public.notifications (type, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Notifications own" on public.notifications;
create policy "Notifications own"
  on public.notifications for select using (user_id = auth.uid());

drop policy if exists "Notifications own update" on public.notifications;
create policy "Notifications own update"
  on public.notifications for update using (user_id = auth.uid());

drop policy if exists "Notifications admin read" on public.notifications;
create policy "Notifications admin read"
  on public.notifications for select using (public.is_admin());

drop policy if exists "Notifications service role all" on public.notifications;
create policy "Notifications service role all"
  on public.notifications for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- notification_preferences
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  mute_sensitive_previews boolean not null default true,
  preferences jsonb not null default '{}'::jsonb
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Notification prefs own" on public.notification_preferences;
create policy "Notification prefs own"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

