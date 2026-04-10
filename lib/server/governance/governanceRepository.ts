/**
 * Domain 7.1 — Governance repository.
 *
 * Data access layer for all 5 governance tables. Immutability is enforced
 * at the DB level by triggers — this layer does not attempt UPDATE or DELETE
 * on audit_events, policy_acceptances_v2, or approval_decisions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import type {
  ApprovalDecision,
  AuditEvent,
  AuditEventCategory,
  ChangeRequest,
  ChangeRequestStatus,
  PolicyAcceptanceV2,
  PolicyDocument,
  PolicyDocumentStatus,
} from "./governanceTypes";

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToAuditEvent(row: Record<string, unknown>): AuditEvent {
  return {
    id: String(row.id),
    actorId: String(row.actor_id),
    tenantId: row.tenant_id != null ? String(row.tenant_id) : null,
    action: String(row.action),
    resourceType: String(row.resource_type),
    resourceId: String(row.resource_id),
    eventCategory: row.event_category as AuditEventCategory,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
  };
}

function rowToPolicyDoc(row: Record<string, unknown>): PolicyDocument {
  return {
    id: String(row.id),
    policyType: String(row.policy_type),
    version: String(row.version),
    title: String(row.title),
    content: String(row.content),
    status: row.status as PolicyDocumentStatus,
    createdByUserId: row.created_by_user_id != null ? String(row.created_by_user_id) : null,
    publishedAt: row.published_at != null ? String(row.published_at) : null,
    deprecatedAt: row.deprecated_at != null ? String(row.deprecated_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToAcceptance(row: Record<string, unknown>): PolicyAcceptanceV2 {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    policyDocumentId: String(row.policy_document_id),
    policyType: String(row.policy_type),
    version: String(row.version),
    acceptedAt: String(row.accepted_at),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function rowToChangeRequest(row: Record<string, unknown>): ChangeRequest {
  return {
    id: String(row.id),
    targetType: String(row.target_type),
    targetId: String(row.target_id),
    requestedChange: (row.requested_change as Record<string, unknown>) ?? {},
    reason: String(row.reason),
    status: row.status as ChangeRequestStatus,
    requestedByUserId: String(row.requested_by_user_id),
    submittedAt: row.submitted_at != null ? String(row.submitted_at) : null,
    resolvedAt: row.resolved_at != null ? String(row.resolved_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToApprovalDecision(row: Record<string, unknown>): ApprovalDecision {
  return {
    id: String(row.id),
    changeRequestId: String(row.change_request_id),
    decision: row.decision as "approved" | "rejected",
    decidedByUserId: String(row.decided_by_user_id),
    reason: row.reason != null ? String(row.reason) : null,
    decidedAt: String(row.decided_at),
    createdAt: String(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Audit events — INSERT ONLY
// ---------------------------------------------------------------------------

export async function insertAuditEvent(
  fields: Omit<AuditEvent, "id" | "createdAt">,
  supabase: SupabaseClient,
): Promise<AuditEvent> {
  const { data, error } = await supabase
    .from("audit_events")
    .insert({
      actor_id: fields.actorId,
      tenant_id: fields.tenantId,
      action: fields.action,
      resource_type: fields.resourceType,
      resource_id: fields.resourceId,
      event_category: fields.eventCategory,
      metadata: fields.metadata,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to insert audit event: ${error?.message ?? "no data"}`);
  }
  return rowToAuditEvent(data as Record<string, unknown>);
}

export async function listAuditEvents(
  filters: {
    resourceType?: string;
    resourceId?: string;
    eventCategory?: string;
    actorId?: string;
    limit?: number;
  },
  supabase: SupabaseClient,
): Promise<AuditEvent[]> {
  let query = supabase
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 50);
  if (filters.resourceType) query = query.eq("resource_type", filters.resourceType);
  if (filters.resourceId) query = query.eq("resource_id", filters.resourceId);
  if (filters.eventCategory) query = query.eq("event_category", filters.eventCategory);
  if (filters.actorId) query = query.eq("actor_id", filters.actorId);

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", `Failed to list audit events: ${error.message}`);
  return (data ?? []).map((row) => rowToAuditEvent(row as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Policy documents
// ---------------------------------------------------------------------------

export async function insertPolicyDocument(
  fields: Omit<PolicyDocument, "id" | "createdAt" | "updatedAt" | "publishedAt" | "deprecatedAt">,
  supabase: SupabaseClient,
): Promise<PolicyDocument> {
  const { data, error } = await supabase
    .from("policy_documents")
    .insert({
      policy_type: fields.policyType,
      doc_type: fields.policyType, // keep legacy column in sync
      is_active: fields.status === "active", // keep legacy column in sync
      version: fields.version,
      title: fields.title,
      content: fields.content,
      status: fields.status,
      created_by_user_id: fields.createdByUserId,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to insert policy document: ${error?.message ?? "no data"}`);
  }
  return rowToPolicyDoc(data as Record<string, unknown>);
}

export async function getActivePolicyDocument(
  policyType: string,
  supabase: SupabaseClient,
): Promise<PolicyDocument | null> {
  const { data, error } = await supabase
    .from("policy_documents")
    .select("*")
    .eq("policy_type", policyType)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", `Failed to read active policy: ${error.message}`);
  return data ? rowToPolicyDoc(data as Record<string, unknown>) : null;
}

export async function getPolicyDocumentById(
  id: string,
  supabase: SupabaseClient,
): Promise<PolicyDocument | null> {
  const { data, error } = await supabase
    .from("policy_documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", `Failed to read policy: ${error.message}`);
  return data ? rowToPolicyDoc(data as Record<string, unknown>) : null;
}

export async function setPolicyDocumentStatus(
  id: string,
  status: PolicyDocumentStatus,
  supabase: SupabaseClient,
): Promise<PolicyDocument> {
  const updates: Record<string, unknown> = {
    status,
    is_active: status === "active", // keep legacy column in sync
    updated_at: new Date().toISOString(),
  };
  if (status === "active") updates.published_at = new Date().toISOString();
  if (status === "deprecated") updates.deprecated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("policy_documents")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to set policy status: ${error?.message ?? "no data"}`);
  }
  return rowToPolicyDoc(data as Record<string, unknown>);
}

export async function listPolicyDocuments(
  policyType: string | null,
  supabase: SupabaseClient,
): Promise<PolicyDocument[]> {
  let query = supabase.from("policy_documents").select("*").order("created_at", { ascending: false });
  if (policyType) query = query.eq("policy_type", policyType);
  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", `Failed to list policies: ${error.message}`);
  return (data ?? []).map((row) => rowToPolicyDoc(row as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Policy acceptances — INSERT ONLY
// ---------------------------------------------------------------------------

export async function insertPolicyAcceptance(
  fields: Omit<PolicyAcceptanceV2, "id" | "acceptedAt">,
  supabase: SupabaseClient,
): Promise<PolicyAcceptanceV2> {
  const { data, error } = await supabase
    .from("policy_acceptances_v2")
    .insert({
      user_id: fields.userId,
      policy_document_id: fields.policyDocumentId,
      policy_type: fields.policyType,
      version: fields.version,
      metadata: fields.metadata,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to insert policy acceptance: ${error?.message ?? "no data"}`);
  }
  return rowToAcceptance(data as Record<string, unknown>);
}

export async function getPolicyAcceptance(
  userId: string,
  policyDocumentId: string,
  supabase: SupabaseClient,
): Promise<PolicyAcceptanceV2 | null> {
  const { data, error } = await supabase
    .from("policy_acceptances_v2")
    .select("*")
    .eq("user_id", userId)
    .eq("policy_document_id", policyDocumentId)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", `Failed to check acceptance: ${error.message}`);
  return data ? rowToAcceptance(data as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// Change requests
// ---------------------------------------------------------------------------

export async function insertChangeRequest(
  fields: Omit<ChangeRequest, "id" | "createdAt" | "updatedAt" | "submittedAt" | "resolvedAt">,
  supabase: SupabaseClient,
): Promise<ChangeRequest> {
  const { data, error } = await supabase
    .from("change_requests")
    .insert({
      target_type: fields.targetType,
      target_id: fields.targetId,
      requested_change: fields.requestedChange,
      reason: fields.reason,
      status: fields.status,
      requested_by_user_id: fields.requestedByUserId,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to insert change request: ${error?.message ?? "no data"}`);
  }
  return rowToChangeRequest(data as Record<string, unknown>);
}

export async function getChangeRequestById(
  id: string,
  supabase: SupabaseClient,
): Promise<ChangeRequest | null> {
  const { data, error } = await supabase
    .from("change_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", `Failed to read change request: ${error.message}`);
  return data ? rowToChangeRequest(data as Record<string, unknown>) : null;
}

export async function updateChangeRequestStatus(
  id: string,
  status: ChangeRequestStatus,
  supabase: SupabaseClient,
): Promise<ChangeRequest> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "pending_approval") updates.submitted_at = new Date().toISOString();
  if (status === "approved" || status === "rejected" || status === "rolled_back") {
    updates.resolved_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from("change_requests")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to update change request: ${error?.message ?? "no data"}`);
  }
  return rowToChangeRequest(data as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Approval decisions — INSERT ONLY
// ---------------------------------------------------------------------------

export async function insertApprovalDecision(
  fields: Omit<ApprovalDecision, "id" | "decidedAt" | "createdAt">,
  supabase: SupabaseClient,
): Promise<ApprovalDecision> {
  const { data, error } = await supabase
    .from("approval_decisions")
    .insert({
      change_request_id: fields.changeRequestId,
      decision: fields.decision,
      decided_by_user_id: fields.decidedByUserId,
      reason: fields.reason,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to insert approval decision: ${error?.message ?? "no data"}`);
  }
  return rowToApprovalDecision(data as Record<string, unknown>);
}
