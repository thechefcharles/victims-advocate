-- Store IP and User-Agent at Liability Waiver acceptance (signup consent).

alter table public.profiles
  add column if not exists liability_waiver_accept_ip inet,
  add column if not exists liability_waiver_accept_user_agent text;

comment on column public.profiles.liability_waiver_accept_ip is 'IP at Liability Waiver acceptance.';
comment on column public.profiles.liability_waiver_accept_user_agent is 'User-Agent at Liability Waiver acceptance.';
