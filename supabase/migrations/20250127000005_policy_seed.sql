-- Phase 4: Seed one active policy per doc_type so users are not blocked inconsistently.
-- Run after 20250127000004_policy_consent.sql. Replace content with your actual legal text.

insert into public.policy_documents (doc_type, version, title, content, is_active, applies_to_role, workflow_key)
values
  (
    'terms_of_use',
    '2025-01',
    'Terms of Use',
    'By using NxtStps you agree to these Terms of Use. This platform provides administrative and informational tools only. No legal, medical, or professional advice is provided. You must be 18 or older to use this service. We may update these terms; continued use constitutes acceptance.',
    true,
    null,
    null
  ),
  (
    'privacy_policy',
    '2025-01',
    'Privacy Policy',
    'NxtStps collects information you provide to complete applications and support your case. We do not sell your data. We use it to operate the service and as required by law. See our full privacy policy on the website.',
    true,
    null,
    null
  ),
  (
    'ai_disclaimer',
    '2025-01',
    'AI Assistance Disclaimer',
    'NxtStps may use automated tools and AI to help you complete forms and answer questions. This is for convenience only. AI output is not legal advice and may be incomplete or wrong. Always review and verify any information before submitting to agencies.',
    true,
    null,
    null
  ),
  (
    'non_legal_advice',
    '2025-01',
    'Not Legal Advice',
    'The compensation intake and guidance provided here are for informational and administrative purposes only. They do not constitute legal advice. For legal advice about your rights or your application, please consult a qualified attorney.',
    true,
    null,
    'compensation_intake'
  );

-- Run this seed once after the policy_consent migration. If you already have active policies, skip or deactivate them first.
