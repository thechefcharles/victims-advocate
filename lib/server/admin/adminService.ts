/**
 * Domain 7.4 — Admin service (thin orchestration layer).
 *
 * Every mutation calls logAuditEvent() — no exceptions.
 * Admin services read from other domains' tables and write audit events.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { logAuditEvent } from "@/lib/server/governance/auditService";
import type { AdminRemediationRecord, AdminRemediationStatus, AdminSupportSession } from "./adminTypes";
import {
  getActiveSupportSession,
  insertRemediationRecord,
  insertSupportSession,
  listRemediationRecords,
  updateRemediationStatus,
} from "./adminRepository";

// ---------------------------------------------------------------------------
// Organization remediation
// ---------------------------------------------------------------------------

export async function remediateOrganization(params: {
  adminUserId: string;
  organizationId: string;
  remediationType: string;
  issueContext: string;
  notes?: string;
  supabase?: SupabaseClient;
}): Promise<AdminRemediationRecord> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const record = await insertRemediationRecord(
    {
      adminUserId: params.adminUserId,
      targetType: "organization",
      targetId: params.organizationId,
      remediationType: params.remediationType,
      issueContext: params.issueContext,
      status: "open",
      notes: params.notes ?? null,
    },
    supabase,
  );

  await logAuditEvent({
    actorId: params.adminUserId,
    action: "admin.organization.remediate",
    resourceType: "organization",
    resourceId: params.organizationId,
    eventCategory: "admin_action",
    metadata: { remediation_id: record.id, type: params.remediationType },
  });

  return record;
}

export async function updateRemediationRecordStatus(params: {
  id: string;
  status: AdminRemediationStatus;
  adminUserId: string;
  supabase?: SupabaseClient;
}): Promise<AdminRemediationRecord> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const updated = await updateRemediationStatus(params.id, params.status, supabase);

  await logAuditEvent({
    actorId: params.adminUserId,
    action: "admin.organization.remediate",
    resourceType: "admin_remediation",
    resourceId: params.id,
    eventCategory: "admin_action",
    metadata: { new_status: params.status },
  });

  return updated;
}

export async function getRemediationRecords(
  filters: { status?: string; limit?: number },
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<AdminRemediationRecord[]> {
  return listRemediationRecords(filters, supabase);
}

// ---------------------------------------------------------------------------
// Support mode
// ---------------------------------------------------------------------------

export async function enterSupportMode(params: {
  adminUserId: string;
  targetType: string;
  targetId: string;
  purpose: string;
  supabase?: SupabaseClient;
}): Promise<AdminSupportSession> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const session = await insertSupportSession(
    {
      adminUserId: params.adminUserId,
      targetType: params.targetType,
      targetId: params.targetId,
      purpose: params.purpose,
    },
    supabase,
  );

  await logAuditEvent({
    actorId: params.adminUserId,
    action: "admin.support_mode.enter",
    resourceType: params.targetType,
    resourceId: params.targetId,
    eventCategory: "admin_action",
    metadata: { purpose: params.purpose, session_id: session.id },
  });

  return session;
}

export async function performSupportAction(params: {
  supportSessionId: string;
  adminUserId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  supabase?: SupabaseClient;
}): Promise<void> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const session = await getActiveSupportSession(params.supportSessionId, supabase);
  if (!session || session.adminUserId !== params.adminUserId) {
    throw new AppError(
      "FORBIDDEN",
      "Active support session required before performing support actions.",
      undefined,
      403,
    );
  }

  await logAuditEvent({
    actorId: params.adminUserId,
    action: "admin.support_mode.act",
    resourceType: params.targetType,
    resourceId: params.targetId,
    eventCategory: "admin_action",
    metadata: {
      support_session_id: session.id,
      action_type: params.actionType,
    },
  });
}

// ---------------------------------------------------------------------------
// Affiliation update (delegates to Domain 6.1 + audit)
// ---------------------------------------------------------------------------

export async function adminUpdateAffiliationStatus(params: {
  organizationId: string;
  toStatus: string;
  reason?: string;
  adminUserId: string;
  supabase?: SupabaseClient;
}): Promise<void> {
  // Import dynamically to avoid circular dependency at module load.
  const { updateProviderAffiliation } = await import(
    "@/lib/server/trust/providerAffiliationService"
  );
  await updateProviderAffiliation({
    organizationId: params.organizationId,
    toStatus: params.toStatus as Parameters<typeof updateProviderAffiliation>[0]["toStatus"],
    reason: params.reason,
    setByUserId: params.adminUserId,
  });
  // Note: updateProviderAffiliation already calls logAuditEvent (wired in 7.1).
  // We add an additional admin-specific audit event for the admin action trail.
  await logAuditEvent({
    actorId: params.adminUserId,
    action: "admin.affiliation.update",
    resourceType: "provider_affiliation",
    resourceId: params.organizationId,
    eventCategory: "admin_action",
    metadata: { to_status: params.toStatus, reason: params.reason ?? null },
  });
}
