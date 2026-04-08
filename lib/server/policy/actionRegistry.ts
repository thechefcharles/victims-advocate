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

  // -------------------------------------------------------------------------
  // Admin actions — platform admin only
  // -------------------------------------------------------------------------
  /** View any resource across all tenants. */
  "admin:view_any",
  /** Edit any resource across all tenants. */
  "admin:edit_any",
  /** Impersonate / view-as a user for support purposes. */
  "admin:impersonate",
] as const;

/** Union of all valid policy action strings. */
export type PolicyAction = (typeof POLICY_ACTIONS)[number];
