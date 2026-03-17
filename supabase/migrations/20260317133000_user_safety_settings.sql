-- Phase 17: Survivor Safety Mode v1

create table if not exists public.user_safety_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  safety_mode_enabled boolean not null default false,
  hide_sensitive_labels boolean not null default true,
  suppress_notification_previews boolean not null default true,
  clear_local_state_on_quick_exit boolean not null default true,
  reduced_dashboard_visibility boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists user_safety_settings_user_id_idx
  on public.user_safety_settings (user_id);

alter table public.user_safety_settings enable row level security;

drop policy if exists "Safety settings own" on public.user_safety_settings;
create policy "Safety settings own"
  on public.user_safety_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Safety settings admin read" on public.user_safety_settings;
create policy "Safety settings admin read"
  on public.user_safety_settings for select
  using (public.is_admin());

drop policy if exists "Safety settings service role all" on public.user_safety_settings;
create policy "Safety settings service role all"
  on public.user_safety_settings for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

