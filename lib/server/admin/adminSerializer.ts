/**
 * Domain 7.4 — Admin serializers.
 *
 * All admin serializers are independent — never reuse tenant-facing serializers.
 * Each produces a shape specific to the admin governance surface.
 */

import type { AdminRemediationRecord, AdminSupportSession } from "./adminTypes";

// ---------------------------------------------------------------------------
// Admin remediation view
// ---------------------------------------------------------------------------

export interface AdminRemediationView {
  id: string;
  targetType: string;
  targetId: string;
  remediationType: string;
  issueContext: string;
  status: string;
  notes: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export function serializeRemediation(r: AdminRemediationRecord): AdminRemediationView {
  return {
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    remediationType: r.remediationType,
    issueContext: r.issueContext,
    status: r.status,
    notes: r.notes,
    resolvedAt: r.resolvedAt,
    createdAt: r.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Admin support session view
// ---------------------------------------------------------------------------

export interface AdminSupportSessionView {
  id: string;
  targetType: string;
  targetId: string;
  purpose: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
}

export function serializeSupportSession(s: AdminSupportSession): AdminSupportSessionView {
  return {
    id: s.id,
    targetType: s.targetType,
    targetId: s.targetId,
    purpose: s.purpose,
    status: s.status,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
  };
}

// ---------------------------------------------------------------------------
// Admin dashboard summary
// ---------------------------------------------------------------------------

export interface AdminDashboardView {
  remediationCounts: Record<string, number>;
  pendingAffiliationReviews: number;
  activeSupportSessions: number;
}

export function serializeAdminDashboard(data: AdminDashboardView): AdminDashboardView {
  return data;
}
