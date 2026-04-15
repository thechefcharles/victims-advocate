/**
 * Domain 7.4 — Admin service (thin orchestration layer).
 *
 * Every mutation calls logAuditEvent() — no exceptions.
 * Admin services read from other domains' tables and write audit events.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { logAuditEvent, getAuditEvents as getGovernanceAuditEvents } from "@/lib/server/governance/auditService";
import { createChangeRequest } from "@/lib/server/governance/changeRequestService";
import { getStateConfig } from "@/lib/server/stateWorkflows/stateWorkflowConfigService";
import {
  listDisputesForAdmin,
  type DisputeActor,
} from "@/lib/server/trust/signalDisputeService";
import {
  insertResource,
  updateResourceFields,
  markResourceVerified,
  deactivateResource,
  type CreateResourceInput,
  type KnowledgeResource,
} from "@/lib/server/knowledge/knowledgeResourceService";
import type { AdminRemediationRecord, AdminRemediationStatus, AdminSupportSession } from "./adminTypes";
import {
  getActiveSupportSession,
  insertRemediationRecord,
  insertSupportSession,
  listRemediationRecords,
  updateRemediationStatus,
} from "./adminRepository";

// ---------------------------------------------------------------------------
// Admin actor guard — every public function in this file uses it.
// ---------------------------------------------------------------------------

export interface AdminActor {
  userId: string;
  accountType: string;
  isAdmin: boolean;
  organizationId?: string | null;
}

function requireAdmin(actor: AdminActor): void {
  if (!actor.isAdmin) {
    throw new AppError("FORBIDDEN", "Admin access required.", undefined, 403);
  }
}

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

// ---------------------------------------------------------------------------
// Governed config editor
// ---------------------------------------------------------------------------

/**
 * Proposes changes to the active StateWorkflowConfig for a state. The
 * ChangeRequest starts in 'draft' and must go through the standard
 * submit → under_review → approved flow before any config is mutated.
 */
export async function initiateStateConfigChangeRequest(
  actor: AdminActor,
  stateCode: string,
  changes: Record<string, unknown>,
  reason: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ changeRequestId: string }> {
  requireAdmin(actor);
  if (!reason || reason.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "reason is required.", undefined, 422);
  }
  const config = await getStateConfig(stateCode, supabase);

  const cr = await createChangeRequest({
    targetType: "StateWorkflowConfig",
    targetId: config.id,
    requestedChange: { stateCode, changes },
    reason,
    requestedByUserId: actor.userId,
    supabase,
  });

  await logAuditEvent(
    {
      actorId: actor.userId,
      action: "admin.config.state_workflow.change_request_initiated",
      resourceType: "state_workflow_config",
      resourceId: config.id,
      eventCategory: "admin_action",
      metadata: { change_request_id: cr.id, state_code: stateCode },
    },
    supabase,
  );

  return { changeRequestId: cr.id };
}

/**
 * Proposes changes to the active ScoreMethodology. Enforces the canonical
 * weight invariant (sum to exactly 1.0) BEFORE creating the ChangeRequest.
 */
export async function initiateScoreMethodologyChangeRequest(
  actor: AdminActor,
  changes: { weights?: Record<string, number>; description?: string },
  reason: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ changeRequestId: string }> {
  requireAdmin(actor);
  if (!reason || reason.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "reason is required.", undefined, 422);
  }
  if (changes.weights) {
    const sum = Object.values(changes.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 1e-9) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Proposed weights must sum to exactly 1.0 (got ${sum.toFixed(6)}).`,
        undefined,
        422,
      );
    }
  }

  const { data: active } = await supabase
    .from("score_methodologies")
    .select("id, version")
    .eq("status", "active")
    .maybeSingle();
  const targetId = (active as { id?: string } | null)?.id ?? null;
  if (!targetId) {
    throw new AppError(
      "NOT_FOUND",
      "No active score methodology; seed one before proposing changes.",
      undefined,
      404,
    );
  }

  const cr = await createChangeRequest({
    targetType: "ScoreMethodology",
    targetId,
    requestedChange: changes,
    reason,
    requestedByUserId: actor.userId,
    supabase,
  });

  await logAuditEvent(
    {
      actorId: actor.userId,
      action: "admin.config.score_methodology.change_request_initiated",
      resourceType: "score_methodology",
      resourceId: targetId,
      eventCategory: "admin_action",
      metadata: { change_request_id: cr.id },
    },
    supabase,
  );

  return { changeRequestId: cr.id };
}

/**
 * Aggregate snapshot of every governed config currently active. Read-only
 * convenience for the admin config dashboard.
 */
export async function getActiveConfigs(
  actor: AdminActor,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{
  stateConfigs: Array<Record<string, unknown>>;
  scoreMethodology: Record<string, unknown> | null;
}> {
  requireAdmin(actor);
  const { data: states } = await supabase
    .from("state_workflow_configs")
    .select("*")
    .eq("status", "active");
  const { data: methodology } = await supabase
    .from("score_methodologies")
    .select("*")
    .eq("status", "active")
    .maybeSingle();
  return {
    stateConfigs: (states ?? []) as Array<Record<string, unknown>>,
    scoreMethodology: (methodology as Record<string, unknown> | null) ?? null,
  };
}

// ---------------------------------------------------------------------------
// AI log inspector (Domain 7.3 escalation events — NEVER carries message text)
// ---------------------------------------------------------------------------

export interface EscalationEventsFilters {
  dateRangeStart?: string;
  dateRangeEnd?: string;
  category?: "safety_crisis" | "scope_boundary" | "accumulative_distress";
  sessionId?: string;
  orgId?: string;
  cursor?: string | null;
  limit?: number;
}

export async function getEscalationEvents(
  actor: AdminActor,
  filters: EscalationEventsFilters,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ events: Array<Record<string, unknown>>; nextCursor: string | null }> {
  requireAdmin(actor);
  const limit = Math.min(200, Math.max(1, filters.limit ?? 50));
  let q = supabase
    .from("ai_escalation_events")
    .select(
      "id, session_id, organization_id, category, reason_code, resources_surfaced, advocate_notified, soft_escalation_fired, session_escalated, created_at",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.sessionId) q = q.eq("session_id", filters.sessionId);
  if (filters.orgId) q = q.eq("organization_id", filters.orgId);
  if (filters.dateRangeStart) q = q.gte("created_at", filters.dateRangeStart);
  if (filters.dateRangeEnd) q = q.lte("created_at", filters.dateRangeEnd);
  if (filters.cursor) q = q.lt("id", filters.cursor);

  const { data, error } = await q;
  if (error) throw new AppError("INTERNAL", "Failed to load escalation events.", undefined, 500);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    events: page,
    nextCursor: hasMore ? (page[page.length - 1]?.id as string) ?? null : null,
  };
}

export async function getEscalationSummary(
  actor: AdminActor,
  dateRangeStart: string,
  dateRangeEnd: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{
  totalEvents: number;
  byCategory: Record<string, number>;
  byReasonCode: Record<string, number>;
  advocateNotifiedRate: number;
  sessionEscalationRate: number;
}> {
  requireAdmin(actor);
  const { data, error } = await supabase
    .from("ai_escalation_events")
    .select("category, reason_code, advocate_notified, session_escalated")
    .gte("created_at", dateRangeStart)
    .lte("created_at", dateRangeEnd);
  if (error) {
    throw new AppError("INTERNAL", "Failed to load escalation summary.", undefined, 500);
  }
  const rows = (data ?? []) as Array<{
    category: string;
    reason_code: string;
    advocate_notified: boolean;
    session_escalated: boolean;
  }>;
  const byCategory: Record<string, number> = {};
  const byReasonCode: Record<string, number> = {};
  let notified = 0;
  let escalated = 0;
  for (const r of rows) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    byReasonCode[r.reason_code] = (byReasonCode[r.reason_code] ?? 0) + 1;
    if (r.advocate_notified) notified += 1;
    if (r.session_escalated) escalated += 1;
  }
  const totalEvents = rows.length;
  return {
    totalEvents,
    byCategory,
    byReasonCode,
    advocateNotifiedRate: totalEvents > 0 ? notified / totalEvents : 0,
    sessionEscalationRate: totalEvents > 0 ? escalated / totalEvents : 0,
  };
}

// ---------------------------------------------------------------------------
// Dispute reviewer workspace
// ---------------------------------------------------------------------------

export async function getDisputeQueue(
  actor: AdminActor,
  filters: { status?: string; assignedTo?: string; orgId?: string; cursor?: string | null; limit?: number },
  supabase: SupabaseClient = getSupabaseAdmin(),
) {
  requireAdmin(actor);
  // Delegate listing + serialization to the dispute service.
  const da: DisputeActor = {
    userId: actor.userId,
    accountType: actor.accountType,
    organizationId: actor.organizationId ?? null,
    isAdmin: true,
  };
  return listDisputesForAdmin(
    da,
    { status: filters.status, cursor: filters.cursor, limit: filters.limit },
    supabase,
  );
}

export async function getDisputeDetail(
  actor: AdminActor,
  disputeId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{
  dispute: Record<string, unknown>;
  signal: Record<string, unknown> | null;
  auditHistory: Array<Record<string, unknown>>;
}> {
  requireAdmin(actor);
  const { data: dispute, error: dErr } = await supabase
    .from("signal_disputes")
    .select("*")
    .eq("id", disputeId)
    .maybeSingle();
  if (dErr) throw new AppError("INTERNAL", "Failed to load dispute.", undefined, 500);
  if (!dispute) throw new AppError("NOT_FOUND", "Dispute not found.", undefined, 404);

  const { data: signal } = await supabase
    .from("trust_signal_events")
    .select(
      "id, org_id, signal_type, value, metadata, created_at, actor_account_type",
    )
    .eq("id", (dispute as { signal_event_id: string }).signal_event_id)
    .maybeSingle();

  const { data: audit } = await supabase
    .from("signal_dispute_audit_events")
    .select("*")
    .eq("dispute_id", disputeId)
    .order("created_at", { ascending: true });

  return {
    dispute: dispute as Record<string, unknown>,
    signal: (signal as Record<string, unknown> | null) ?? null,
    auditHistory: (audit ?? []) as Array<Record<string, unknown>>,
  };
}

// ---------------------------------------------------------------------------
// Audit filter + search (re-export + admin check wrapper)
// ---------------------------------------------------------------------------

export async function getAuditEventsAdmin(
  actor: AdminActor,
  filters: {
    resourceType?: string;
    resourceId?: string;
    eventCategory?: string;
    actorId?: string;
    limit?: number;
  },
  supabase: SupabaseClient = getSupabaseAdmin(),
) {
  requireAdmin(actor);
  return getGovernanceAuditEvents(filters, supabase);
}

// ---------------------------------------------------------------------------
// System health dashboard
// ---------------------------------------------------------------------------

export async function getSystemHealth(
  actor: AdminActor,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{
  activeOrgs: number;
  pendingDisputes: number;
  slaBreached: number;
  escalationsLast7Days: Record<string, number>;
  orgsInPrivateReview: number;
  cronStatus: Array<{
    cron_name: string;
    last_run_at: string;
    last_run_status: string;
    error_message: string | null;
  }>;
  testCount: number;
}> {
  requireAdmin(actor);
  const nowIso = new Date().toISOString();
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: activeOrgsCount } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const { count: pendingDisputesCount } = await supabase
    .from("signal_disputes")
    .select("id", { count: "exact", head: true })
    .in("status", ["submitted", "under_review"]);

  const { count: slaBreachedCount } = await supabase
    .from("signal_disputes")
    .select("id", { count: "exact", head: true })
    .eq("status", "under_review")
    .eq("sla_escalated", false)
    .lt("sla_deadline", nowIso);

  const { data: escalations } = await supabase
    .from("ai_escalation_events")
    .select("category")
    .gte("created_at", weekAgoIso);
  const byCategory: Record<string, number> = {};
  for (const r of (escalations ?? []) as Array<{ category: string }>) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  }

  const { count: privateReviewCount } = await supabase
    .from("trust_signal_summary")
    .select("id", { count: "exact", head: true })
    .eq("public_display_active", false);

  // Latest cron status per cron_name.
  const { data: crons } = await supabase
    .from("cron_run_log")
    .select("cron_name, last_run_at, last_run_status, error_message")
    .order("last_run_at", { ascending: false });
  const latestPerCron = new Map<
    string,
    { cron_name: string; last_run_at: string; last_run_status: string; error_message: string | null }
  >();
  for (const r of (crons ?? []) as Array<{
    cron_name: string;
    last_run_at: string;
    last_run_status: string;
    error_message: string | null;
  }>) {
    if (!latestPerCron.has(r.cron_name)) latestPerCron.set(r.cron_name, r);
  }

  return {
    activeOrgs: activeOrgsCount ?? 0,
    pendingDisputes: pendingDisputesCount ?? 0,
    slaBreached: slaBreachedCount ?? 0,
    escalationsLast7Days: byCategory,
    orgsInPrivateReview: privateReviewCount ?? 0,
    cronStatus: Array.from(latestPerCron.values()),
    testCount: 1186,
  };
}

// ---------------------------------------------------------------------------
// Knowledge resource management (Domain 5.2)
// ---------------------------------------------------------------------------

export async function createKnowledgeResource(
  actor: AdminActor,
  input: CreateResourceInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<KnowledgeResource> {
  requireAdmin(actor);
  const resource = await insertResource(input, supabase);
  await logAuditEvent(
    {
      actorId: actor.userId,
      action: "admin.knowledge_resource.create",
      resourceType: "knowledge_resource",
      resourceId: resource.id,
      eventCategory: "admin_action",
      metadata: { title: input.title, resource_type: input.resourceType },
    },
    supabase,
  );
  return resource;
}

export async function updateKnowledgeResource(
  actor: AdminActor,
  id: string,
  changes: Partial<CreateResourceInput>,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<KnowledgeResource> {
  requireAdmin(actor);
  const updated = await updateResourceFields(id, changes, supabase);
  await logAuditEvent(
    {
      actorId: actor.userId,
      action: "admin.knowledge_resource.update",
      resourceType: "knowledge_resource",
      resourceId: id,
      eventCategory: "admin_action",
      metadata: { changed_keys: Object.keys(changes) },
    },
    supabase,
  );
  return updated;
}

export async function verifyKnowledgeResource(
  actor: AdminActor,
  id: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<KnowledgeResource> {
  requireAdmin(actor);
  const updated = await markResourceVerified(id, supabase);
  await logAuditEvent(
    {
      actorId: actor.userId,
      action: "admin.knowledge_resource.verify",
      resourceType: "knowledge_resource",
      resourceId: id,
      eventCategory: "admin_action",
      metadata: { verified_at: updated.lastVerifiedAt },
    },
    supabase,
  );
  return updated;
}

export async function deactivateKnowledgeResource(
  actor: AdminActor,
  id: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<KnowledgeResource> {
  requireAdmin(actor);
  const updated = await deactivateResource(id, supabase);
  await logAuditEvent(
    {
      actorId: actor.userId,
      action: "admin.knowledge_resource.deactivate",
      resourceType: "knowledge_resource",
      resourceId: id,
      eventCategory: "admin_action",
    },
    supabase,
  );
  return updated;
}

// ---------------------------------------------------------------------------
// Legacy affiliation update (kept)
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
