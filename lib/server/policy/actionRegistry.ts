/**
 * Domain 0.3 — Policy action registry.
 *
 * POLICY_ACTIONS is the single canonical list of all actions the policy engine
 * can evaluate. Every action must appear here before it can be passed to can().
 *
 * Naming convention: "resource:verb" — resource matches PolicyResourceType,
 * verb is the operation being attempted.
 *
 * Actions confirmed in Domain 0.3 analysis (see Notion):
 * - case:delete added (owner-only; distinct from case:close)
 * - case:update_status added (sub-action of case:edit for state machine)
 * - case:view_timeline added (timeline read access)
 * - document:restrict + document:unrestrict split from document:share
 * - org:view_members split from org:manage_members (read vs write, auditor support)
 */
export const POLICY_ACTIONS = [
  // -------------------------------------------------------------------------
  // Case actions
  // -------------------------------------------------------------------------
  /** Read a case and its contents. */
  "case:read",
  /** Edit case fields (application data, name, state). */
  "case:edit",
  /** Assign an advocate to a case. Leadership only. */
  "case:assign",
  /** Close a case. Leadership only. */
  "case:close",
  /** Reopen a closed case. Leadership only. */
  "case:reopen",
  /** Permanently delete a case. Applicant (owner) only. */
  "case:delete",
  /** Transition case status via state machine. */
  "case:update_status",
  /** View the case timeline / audit trail. */
  "case:view_timeline",
  /** Create a case from an accepted support request. CASE_LEADERSHIP only. */
  "case:create_from_support_request",
  /** Reassign a case to a different advocate. CASE_LEADERSHIP only. */
  "case:reassign",
  /** Create a case note. CASE_STAFF only. */
  "case:note_create",
  /** View case notes. CASE_STAFF or applicant owner. */
  "case:note_view",
  /** View case next-steps panel. CASE_STAFF or applicant owner. */
  "case:next_steps_view",
  /** Mark case ready for submission. CASE_LEADERSHIP or assigned advocate. */
  "case:mark_ready",
  /** Submit case to state program. CASE_LEADERSHIP only. */
  "case:submit",
  /** Record outcome (approved/denied). CASE_LEADERSHIP only. */
  "case:record_outcome",
  /** Start appeal on a denied case. Applicant owner only. */
  "case:appeal_start",

  // -------------------------------------------------------------------------
  // Support request actions
  // -------------------------------------------------------------------------
  /** Create a new support request. Applicant only. */
  "support_request:create",
  /** View a support request. Applicant (own), provider (org-scoped), admin. */
  "support_request:view",
  /** Update mutable fields on a draft request. Applicant (owner, draft only). */
  "support_request:update_self",
  /** Submit a support request for review. Applicant (owner) only. */
  "support_request:submit",
  /** Accept an incoming support request. ACCEPT_LEADERSHIP only. */
  "support_request:accept",
  /** Decline a support request. ACCEPT_LEADERSHIP only. */
  "support_request:decline",
  /** Assign a request to an advocate. ACCEPT_LEADERSHIP only. */
  "support_request:assign",
  /** Transfer a support request to another org. Leadership only. */
  "support_request:transfer",
  /** Withdraw a pending support request. Applicant (owner) only. */
  "support_request:withdraw",
  /** Close a terminal support request. ACCEPT_LEADERSHIP only. */
  "support_request:close",
  /** View the status reason (decline_reason) on a request. Applicant (own), provider (org-scoped). */
  "support_request:view_status_reason",

  // -------------------------------------------------------------------------
  // Document actions
  // -------------------------------------------------------------------------
  /** Upload a new document to a case. */
  "document:upload",
  /** View / download a document. */
  "document:view",
  /** Share a document with another party. Leadership only. */
  "document:share",
  /** Restrict access to a document. victim_advocate, org_owner, supervisor. */
  "document:restrict",
  /** Remove restriction from a document. victim_advocate, org_owner, supervisor. */
  "document:unrestrict",
  /** Delete a document. Applicant (owner) or provider leadership. */
  "document:delete",
  /** Replace a document (new file, preserve same document id). Applicant (own, active) or CASE_STAFF. */
  "document:replace",
  /** Download a document — issues a signed URL. Separate SOC 2 audit trail from view. */
  "document:download",
  /** Lock a document (immutable). CASE_LEADERSHIP only. */
  "document:lock",

  // -------------------------------------------------------------------------
  // Consent actions (Domain 1.4)
  // -------------------------------------------------------------------------
  /** Create a consent grant. Applicant only. */
  "consent:create",
  /** View a consent grant. Applicant (own), Provider (CASE_STAFF), Platform Admin. */
  "consent:view",
  /** Revoke a consent grant. Applicant only (own grant). */
  "consent:revoke",
  /** Request consent from an applicant. Provider (CASE_STAFF) or Platform Admin. */
  "consent:request",

  // -------------------------------------------------------------------------
  // Message thread actions (Domain 1.3)
  // -------------------------------------------------------------------------
  /** Create a workflow-bound message thread. CASE_LEADERSHIP only. */
  "message_thread:create_workflow",
  /** View a message thread (metadata + status). Participant or CASE_STAFF. */
  "message_thread:view",
  /** Archive a message thread. CASE_LEADERSHIP only. */
  "message_thread:archive",
  /** Set a thread to read_only. Internal — triggered by workflow state changes. */
  "message_thread:set_read_only",

  // -------------------------------------------------------------------------
  // Message actions
  // -------------------------------------------------------------------------
  /** Send a message in a case conversation. */
  "message:send",
  /** Read messages in a case conversation. */
  "message:read",
  /** Delete a message. Own messages or provider leadership. */
  "message:delete",
  /** Upload an attachment to a message thread. Deferred: requires Domain 1.4. */
  "message:attachment_upload",

  // -------------------------------------------------------------------------
  // Intake actions (Domain 2.1)
  // -------------------------------------------------------------------------
  /** Start a new intake session. Applicant only (own session). */
  "intake:start",
  /** Save draft mutations to an intake session. Applicant only (own, draft only). */
  "intake:save_draft",
  /** Submit an intake session — produces an immutable intake_submissions row. */
  "intake:submit",
  /** View an intake session or submission. Applicant (own), CASE_STAFF (case-linked), Platform Admin. */
  "intake:view",
  /** Amend an intake submission after-the-fact. CASE_STAFF / Platform Admin only in v1. */
  "intake:amend_after_submission",
  /** Lock an intake session against further edits. Platform Admin (support mode) only. */
  "intake:lock_from_silent_edits",

  // -------------------------------------------------------------------------
  // State workflow config actions (Domain 2.2)
  // -------------------------------------------------------------------------
  /** View a single state_workflow_config (admin context). Platform Admin only. */
  "state_workflow:view",
  /** List state_workflow_configs (admin context). Platform Admin only. */
  "state_workflow:list",
  /** Publish a draft state_workflow_config — transitions draft → active. Platform Admin only. */
  "state_workflow:publish_version",
  /** Deprecate an active state_workflow_config — transitions active → deprecated. Platform Admin only. */
  "state_workflow:deprecate_version",
  /** Mutate a draft state_workflow_config (status must be 'draft'). Platform Admin only. */
  "state_workflow:update_config",
  /** Resolve the active config for a state at runtime. Allowed for any authenticated user. */
  "state_workflow:resolve_active_config",

  // -------------------------------------------------------------------------
  // CVC form template actions (Domain 2.3 — admin only)
  // -------------------------------------------------------------------------
  /** Create a new draft CVC form template. Platform Admin only. */
  "cvc_template:create",
  /** View a single CVC form template (admin context). Platform Admin only. */
  "cvc_template:view",
  /** List CVC form templates (admin context). Platform Admin only. */
  "cvc_template:list",
  /** Upload the source PDF file for a draft template. Platform Admin only. */
  "cvc_template:upload_source",
  /** Mutate metadata on a draft template (status must be 'draft'). Platform Admin only. */
  "cvc_template:update",
  /** Activate a draft template — runs alignment validation first. Platform Admin only. */
  "cvc_template:activate",
  /** Deprecate an active template. Platform Admin only. */
  "cvc_template:deprecate",
  /** Create or update field/mapping rows on a draft template. Platform Admin only. */
  "cvc_template:map_fields",
  /** Run alignment validation as a preview (does not change status). Platform Admin only. */
  "cvc_template:validate_alignment",

  // -------------------------------------------------------------------------
  // CVC form runtime actions (Domain 2.3)
  // -------------------------------------------------------------------------
  /** Preview generation readiness for a case. CASE_STAFF in tenant scope. */
  "cvc_form:preview",
  /** Generate the CVC PDF for a case (creates output_generation_jobs row). CASE_STAFF in tenant scope. */
  "cvc_form:generate",
  /** Download the most recent generated CVC PDF for a case. CASE_STAFF in tenant scope. */
  "cvc_form:download",

  // -------------------------------------------------------------------------
  // Translation / i18n actions (Domain 2.4)
  // -------------------------------------------------------------------------
  /** View a translation_mapping_set in admin context. Platform Admin only. */
  "translation_mapping_set:view",
  /** Mutate a draft translation_mapping_set. Platform Admin only. */
  "translation_mapping_set:update",
  /** Publish a draft translation_mapping_set — transitions draft → active. Platform Admin only. */
  "translation_mapping_set:publish",
  /** Resolve a canonical value for a source value at runtime. Any authenticated user. */
  "translation_mapping:resolve",
  /** Use the Explain This feature. Any authenticated user (applicant + provider + agency). */
  "translation:explain_text",
  /** View the persistent explanation_requests audit log. Platform Admin only. */
  "translation:explanation_view_log",
  /** Update own locale_preferences row. Owner only (any authenticated user). */
  "locale_preference:update",

  // -------------------------------------------------------------------------
  // Org actions
  // -------------------------------------------------------------------------
  /** Manage (add, remove, change role) org members. org_owner, supervisor. */
  "org:manage_members",
  /** View the org member list. org_owner, supervisor, auditor. */
  "org:view_members",
  /** View all cases in the org. All case-access org roles. */
  "org:view_cases",
  /** Edit the org's public/internal profile. org_owner, supervisor. */
  "org:edit_profile",

  // Domain 3.2 additions — 12 new org actions
  /** View org profile (public/internal view). Any active org member. */
  "org:view_profile",
  /** Register a new org (platform-controlled; admin only). */
  "org:register",
  /** Create or list org invites. org_owner, program_manager only. */
  "org:invite",
  /** Accept an org invite token. Any authenticated user (no org role required). */
  "org:accept_invite",
  /** Revoke a pending org invite. org_owner, program_manager only. */
  "org:revoke_invite",
  /** Request to join an existing org (advocate role). */
  "org:request_to_join",
  /** Approve or decline a join request. org_owner, program_manager, supervisor. */
  "org:approve_join",
  /** Update a member's org_role. org_owner, program_manager only. */
  "org:update_member_role",
  /** Revoke an org membership. org_owner, program_manager only. */
  "org:revoke_member",
  /** Submit org profile for public activation review. Leadership tier. */
  "org:submit_for_review",
  /** Submit or manage org claim request (platform-controlled; admin only). */
  "org:claim",
  /** View the org's program catalog. Any active org member. */
  "org:view_program_catalog",

  // -------------------------------------------------------------------------
  // Admin actions — platform admin only
  // -------------------------------------------------------------------------
  /** View any resource across all tenants. */
  "admin:view_any",
  /** Edit any resource across all tenants. */
  "admin:edit_any",
  /** Impersonate / view-as a user for support purposes. */
  "admin:impersonate",

  // -------------------------------------------------------------------------
  // Domain 3.1 — Applicant Domain actions
  // -------------------------------------------------------------------------
  /** View own applicant profile (self or trusted helper with profile:view). */
  "applicant_profile:view",
  /** Update own applicant profile (self only). */
  "applicant_profile:update",
  /** View another applicant's profile (provider with case access or admin). */
  "applicant_profile:view_others",
  /** View own applicant preferences (self only). */
  "applicant_preference:view",
  /** Update own applicant preferences (self only). */
  "applicant_preference:update",
  /** View own safety preferences (self only). */
  "safety_preference:view",
  /** Update own safety preferences (self only). */
  "safety_preference:update",
  /** Trigger quick exit — clears local state and redirects to safe URL. */
  "safety_preference:quick_exit",
  /** Grant trusted helper access to another user. Applicant only. */
  "trusted_helper:grant",
  /** Revoke a trusted helper grant. Applicant owner or platform admin. */
  "trusted_helper:revoke",
  /** List trusted helpers for own account. Applicant only. */
  "trusted_helper:list",
  /** Act on behalf of an applicant as an active trusted helper. */
  "trusted_helper:act_as",
  /** Create a bookmark for a provider, program, or resource. Applicant only. */
  "applicant_bookmark:create",
  /** List own bookmarks. Applicant only. */
  "applicant_bookmark:list",
  /** Delete own bookmark. Applicant only. */
  "applicant_bookmark:delete",
  /** Reorder own bookmarks. Applicant only. */
  "applicant_bookmark:reorder",

  // -------------------------------------------------------------------------
  // Domain 3.3 — Program Domain actions
  // -------------------------------------------------------------------------
  /** Create, update, activate, and archive program definitions. Platform Admin only. */
  "admin:manage_programs",
  /** Link organization to an IL directory catalog entry. org_owner, supervisor. */
  "org:link_catalog_entry",
  /** Set the applicant's program affiliation in their profile. Any authenticated user. */
  "profile:set_affiliation",
] as const;

/** Union of all valid policy action strings. */
export type PolicyAction = (typeof POLICY_ACTIONS)[number];
