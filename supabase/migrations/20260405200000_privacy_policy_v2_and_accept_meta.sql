-- Privacy Policy v2.0 activation + acceptance IP/UA on profiles.

alter table public.profiles
  add column if not exists privacy_policy_accept_ip inet,
  add column if not exists privacy_policy_accept_user_agent text;

comment on column public.profiles.privacy_policy_accept_ip is 'IP at Privacy Policy v2 acceptance (signup consent).';
comment on column public.profiles.privacy_policy_accept_user_agent is 'User-Agent at Privacy Policy v2 acceptance.';

-- Deactivate prior privacy_policy row in default slot (null applies_to_role, null workflow_key).
update public.policy_documents
set is_active = false, updated_at = now()
where doc_type = 'privacy_policy'
  and coalesce(applies_to_role, '') = ''
  and coalesce(workflow_key, '') = ''
  and is_active = true;

insert into public.policy_documents (
  doc_type,
  version,
  title,
  content,
  is_active,
  applies_to_role,
  workflow_key,
  metadata
)
values (
  'privacy_policy',
  '2.0',
  'NxtStps Privacy Policy',
  'Version 2.0. The full Privacy Policy was presented in the NxtStps application at acceptance. Contact privacy@nxtstps.org or see /privacy for the complete text.',
  true,
  null,
  null,
  jsonb_build_object(
    'summary',
    'Expanded for organizational and Applicant distinctions, survivor safety, cookies, breach notification, retention, BIPA, GPC, and withdrawal of consent.'
  )
);
