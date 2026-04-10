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
  /** View a single trusted helper grant. Applicant owner, helper party, or admin. */
  "trusted_helper:view",
  /** Revoke a trusted helper grant. Applicant owner or platform admin. */
  "trusted_helper:revoke",
  /** Accept a pending trusted helper grant. Helper party only. */
  "trusted_helper:accept",
  /** Expire an active trusted helper grant. Admin / system sweep only. */
  "trusted_helper:expire",
  /** Update scope on an active trusted helper grant. Applicant owner only. */
  "trusted_helper:scope.update",
  /** View the audit trail for a trusted helper grant. Applicant owner or admin. */
  "trusted_helper:audit.view",
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

  // -------------------------------------------------------------------------
  // Domain 4.1 — Referral actions
  // -------------------------------------------------------------------------
  /** Create a referral (draft). Source-org leadership only. */
  "referral:create",
  /** View a referral. Source org, target org (scoped), or applicant (own). */
  "referral:view",
  /** Accept a referral (pending_acceptance → accepted). Target-org leadership only. */
  "referral:accept",
  /** Reject a referral (pending_acceptance → rejected). Target-org leadership only. */
  "referral:reject",
  /** Cancel a referral (any non-closed status → cancelled). Source-org leadership. */
  "referral:cancel",
  /** Close a referral (accepted/rejected/cancelled → closed). Source-org leadership. */
  "referral:close",
  /** View a referral share package. Provider only (source or target org). */
  "referral:share_package.view",
  /** Prepare a referral share package. Source-org leadership only. */
  "referral:share_package.prepare",

  // -------------------------------------------------------------------------
  // Domain 4.2 — Appointment actions
  // -------------------------------------------------------------------------
  /** Create a new appointment. Provider staff in the org only. */
  "appointment:create",
  /** View a single appointment. Applicant (own case), provider (org-scoped), admin. */
  "appointment:view",
  /** Update mutable metadata on an appointment (notes, staff, service type). */
  "appointment:update",
  /** Reschedule an appointment — creates new slot, marks original as rescheduled. */
  "appointment:reschedule",
  /** Cancel an appointment. Provider staff or applicant (own case). */
  "appointment:cancel",
  /** Mark an appointment as completed (terminal). Provider staff only. */
  "appointment:complete",
  /** List appointments. Provider (org-scoped), applicant (own), admin. */
  "appointment:list",
  /** View availability rules for scheduling context. Provider or applicant. */
  "appointment:availability.view",

  // -------------------------------------------------------------------------
  // Domain 4.3 — Event actions
  // -------------------------------------------------------------------------
  /** Create a new event in draft. Provider leadership only. */
  "event:create",
  /** View a single event. Public for published+visible scopes, provider for own org. */
  "event:view",
  /** Update event metadata. Provider staff in the owning org. */
  "event:update",
  /** Publish an event (draft → published). Provider leadership only. */
  "event:publish",
  /** Cancel an event (any non-closed → cancelled). Provider leadership only. */
  "event:cancel",
  /** Close an event (terminal). Provider leadership only. */
  "event:close",
  /** List events. Public for visible scope, provider for org scope. */
  "event:list",
  /** Register for a published event. Any authenticated user (scope-permitting). */
  "event:register",
  /** Cancel own registration for an event. */
  "event:unregister",

  // -------------------------------------------------------------------------
  // Domain 3.4 — Provider Discovery actions
  // -------------------------------------------------------------------------
  /** Browse the provider discovery map and search index. Any authenticated user. */
  "provider_search:browse",

  // -------------------------------------------------------------------------
  // Domain 5.2 — Recommendations actions
  // -------------------------------------------------------------------------
  /** Generate a fresh recommendation set. Applicant (own), provider (non-personalized). */
  "recommendation:generate",
  /** View an existing recommendation set. Applicant (own), provider, admin. */
  "recommendation:view",
  /** Force regeneration of a recommendation set, bypassing cache. */
  "recommendation:refresh",

  // -------------------------------------------------------------------------
  // Domain 6.1 — Trust / Transparency / Scoring actions (12)
  // -------------------------------------------------------------------------
  /** View public reliability summary (any authenticated user). */
  "provider_reliability:view_public",
  /** View applicant-safe reliability summary (applicant or provider). */
  "provider_reliability:view_applicant_safe",
  /** View own org's internal score snapshot (provider leadership). */
  "provider_score:view_internal",
  /** View comparative cross-provider analytics (agency oversight). */
  "provider_score:view_comparative",
  /** Recalculate own org's score (provider leadership or admin). */
  "provider_score:recalculate",
  /** Open a dispute against a score snapshot (provider leadership). */
  "provider_score:dispute.create",
  /** Review a score dispute (platform admin only). */
  "provider_score:dispute.review",
  /** View a score methodology (platform admin only). */
  "score_methodology:view",
  /** Update a draft score methodology (platform admin only). */
  "score_methodology:update",
  /** Publish a draft score methodology — atomic with deprecating prior active. Platform admin. */
  "score_methodology:publish",
  /** View provider affiliation status (provider own-org, agency oversight, admin). */
  "provider_affiliation:view",
  /** Manage provider affiliation status (platform admin only). */
  "provider_affiliation:manage",

  // -------------------------------------------------------------------------
  // Domain 6.2 — Agency / Reporting actions (9)
  // -------------------------------------------------------------------------
  /** Create a reporting submission draft. Provider leadership (own org). */
  "reporting_submission:create",
  /** Submit a reporting package. Provider leadership (own org). */
  "reporting_submission:submit",
  /** View a reporting submission. Provider (own org), agency (in-scope), admin. */
  "reporting_submission:view",
  /** Request revision on a submission. Agency Officer/Owner only. */
  "reporting_submission:request_revision",
  /** Accept a submission. Agency Officer/Owner ONLY — Reviewer CANNOT accept. */
  "reporting_submission:accept",
  /** Reject a submission. Agency Officer/Owner ONLY — Reviewer CANNOT reject. */
  "reporting_submission:reject",
  /** Issue a formal notice to a provider. Agency Officer/Owner. */
  "agency_notice:create",
  /** View agency analytics dashboard. Any agency member. */
  "agency_analytics:view",
  /** View comparative cross-provider analytics from agency scope. */
  "provider_score:view_agency_comparative",

  // -------------------------------------------------------------------------
  // Domain 7.2 — Notifications (7)
  // -------------------------------------------------------------------------
  /** List own notifications. Any authenticated user. */
  "notification:list",
  /** View a single notification. Owner only. */
  "notification:view",
  /** Mark a notification as read. Owner only. */
  "notification:mark_read",
  /** Mark a notification as unread. Owner only. */
  "notification:mark_unread",
  /** Dismiss a notification. Owner only. */
  "notification:dismiss",
  /** View own notification preferences. Owner only. */
  "notification:preference.view",
  /** Update own notification preferences. Owner only. */
  "notification:preference.update",
] as const;

/** Union of all valid policy action strings. */
export type PolicyAction = (typeof POLICY_ACTIONS)[number];
