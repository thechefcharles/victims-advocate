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

  // -------------------------------------------------------------------------
  // Support request actions
  // -------------------------------------------------------------------------
  /** Create a new support request. Applicant only. */
  "support_request:create",
  /** Submit a support request for review. Applicant (owner) only. */
  "support_request:submit",
  /** Accept an incoming support request. Provider staff. */
  "support_request:accept",
  /** Decline a support request. Provider staff. */
  "support_request:decline",
  /** Withdraw a pending support request. Applicant (owner) only. */
  "support_request:withdraw",
  /** Transfer a support request to another org. Leadership only. */
  "support_request:transfer",

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

  // -------------------------------------------------------------------------
  // Message actions
  // -------------------------------------------------------------------------
  /** Send a message in a case conversation. */
  "message:send",
  /** Read messages in a case conversation. */
  "message:read",
  /** Delete a message. Own messages or provider leadership. */
  "message:delete",

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
