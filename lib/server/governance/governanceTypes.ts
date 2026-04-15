/**
 * Domain 7.1 — Governance / Policy Documents / Audit — canonical types.
 *
 * Data class: A — Restricted.
 * SOC 2 gate: YES — must be locked before Month 9 Type I audit.
 *
 * This domain is the system of record for governance. Its most important
 * export is `logAuditEvent()` (in auditService.ts) — the global audit
 * function every domain calls for critical mutations.
 *
 * Immutability rules (DB-level enforced):
 *   - audit_events: INSERT ONLY — triggers block UPDATE/DELETE
 *   - policy_acceptances_v2: INSERT ONLY — triggers block UPDATE/DELETE
 *   - approval_decisions: INSERT ONLY — triggers block UPDATE/DELETE
 */

// ---------------------------------------------------------------------------
// Governed targets — MUST validate change requests against this list
// ---------------------------------------------------------------------------

export const GOVERNED_TARGETS = [
  "ScoreMethodology",
  "StateWorkflowConfig",
  "PolicyDocument",
  "TranslationMappingSet",
  "ProviderAffiliationStatus",
  "TrustSignalConfig",
] as const;

export type GovernedTarget = (typeof GOVERNED_TARGETS)[number];

// ---------------------------------------------------------------------------
// Audit event category
// ---------------------------------------------------------------------------

export const AUDIT_EVENT_CATEGORIES = [
  "auth_security",
  "policy_acceptance",
  "governance_change",
  "trust_scoring",
  "workflow_transition",
  "admin_action",
  "compliance_event",
] as const;

export type AuditEventCategory = (typeof AUDIT_EVENT_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Policy document status
// ---------------------------------------------------------------------------

export const POLICY_DOCUMENT_STATUSES = ["draft", "active", "deprecated"] as const;
export type PolicyDocumentStatus = (typeof POLICY_DOCUMENT_STATUSES)[number];

// ---------------------------------------------------------------------------
// Change request status
// ---------------------------------------------------------------------------

export const CHANGE_REQUEST_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "rolled_back",
  "closed",
] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

// ---------------------------------------------------------------------------
// DB row interfaces
// ---------------------------------------------------------------------------

export interface AuditEvent {
  id: string;
  actorId: string;
  tenantId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  eventCategory: AuditEventCategory;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface PolicyDocument {
  id: string;
  policyType: string;
  version: string;
  title: string;
  content: string;
  status: PolicyDocumentStatus;
  createdByUserId: string | null;
  publishedAt: string | null;
  deprecatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyAcceptanceV2 {
  id: string;
  userId: string;
  policyDocumentId: string;
  policyType: string;
  version: string;
  acceptedAt: string;
  metadata: Record<string, unknown>;
}

export interface ChangeRequest {
  id: string;
  targetType: string;
  targetId: string;
  requestedChange: Record<string, unknown>;
  reason: string;
  status: ChangeRequestStatus;
  requestedByUserId: string;
  submittedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalDecision {
  id: string;
  changeRequestId: string;
  decision: "approved" | "rejected";
  decidedByUserId: string;
  reason: string | null;
  decidedAt: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// logAuditEvent input shape
// ---------------------------------------------------------------------------

export interface LogAuditEventInput {
  actorId: string;
  tenantId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  eventCategory: AuditEventCategory;
  metadata?: Record<string, unknown>;
  /** Source IP address — populated at route boundary when available. */
  ipAddress?: string;
  /** User agent string — populated at route boundary when available. */
  userAgent?: string;
}
