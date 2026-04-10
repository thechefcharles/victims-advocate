/**
 * Domain 7.4 — Admin Tools — canonical types.
 *
 * GREEN tier — correct boundary, not over-built.
 * Admin tools is a thin orchestration layer that reads from other domains'
 * tables via admin services and writes audit events on every mutation.
 *
 * Critical rule: EVERY admin mutation calls logAuditEvent() — no exceptions.
 */

// ---------------------------------------------------------------------------
// Remediation
// ---------------------------------------------------------------------------

export const ADMIN_REMEDIATION_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;
export type AdminRemediationStatus =
  (typeof ADMIN_REMEDIATION_STATUSES)[number];

export interface AdminRemediationRecord {
  id: string;
  adminUserId: string;
  targetType: string;
  targetId: string;
  remediationType: string;
  issueContext: string;
  status: AdminRemediationStatus;
  notes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Support mode session
// ---------------------------------------------------------------------------

export interface AdminSupportSession {
  id: string;
  adminUserId: string;
  targetType: string;
  targetId: string;
  purpose: string;
  status: "active" | "closed";
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}
