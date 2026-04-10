/**
 * Domain 7.4 — Admin repository.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import type { AdminRemediationRecord, AdminRemediationStatus, AdminSupportSession } from "./adminTypes";

function rowToRemediation(row: Record<string, unknown>): AdminRemediationRecord {
  return {
    id: String(row.id),
    adminUserId: String(row.admin_user_id),
    targetType: String(row.target_type),
    targetId: String(row.target_id),
    remediationType: String(row.remediation_type),
    issueContext: String(row.issue_context),
    status: row.status as AdminRemediationStatus,
    notes: row.notes != null ? String(row.notes) : null,
    resolvedAt: row.resolved_at != null ? String(row.resolved_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToSupportSession(row: Record<string, unknown>): AdminSupportSession {
  return {
    id: String(row.id),
    adminUserId: String(row.admin_user_id),
    targetType: String(row.target_type),
    targetId: String(row.target_id),
    purpose: String(row.purpose),
    status: row.status as "active" | "closed",
    startedAt: String(row.started_at),
    endedAt: row.ended_at != null ? String(row.ended_at) : null,
    createdAt: String(row.created_at),
  };
}

// Remediation records
export async function insertRemediationRecord(
  fields: Omit<AdminRemediationRecord, "id" | "createdAt" | "updatedAt" | "resolvedAt">,
  supabase: SupabaseClient,
): Promise<AdminRemediationRecord> {
  const { data, error } = await supabase
    .from("admin_remediation_records")
    .insert({
      admin_user_id: fields.adminUserId, target_type: fields.targetType,
      target_id: fields.targetId, remediation_type: fields.remediationType,
      issue_context: fields.issueContext, status: fields.status, notes: fields.notes,
    })
    .select("*").single();
  if (error || !data) throw new AppError("INTERNAL", `Failed to create remediation: ${error?.message ?? "no data"}`);
  return rowToRemediation(data as Record<string, unknown>);
}

export async function updateRemediationStatus(
  id: string, status: AdminRemediationStatus, supabase: SupabaseClient,
): Promise<AdminRemediationRecord> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "resolved") updates.resolved_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("admin_remediation_records").update(updates).eq("id", id).select("*").single();
  if (error || !data) throw new AppError("INTERNAL", `Failed to update remediation: ${error?.message ?? "no data"}`);
  return rowToRemediation(data as Record<string, unknown>);
}

export async function listRemediationRecords(
  filters: { status?: string; limit?: number }, supabase: SupabaseClient,
): Promise<AdminRemediationRecord[]> {
  let query = supabase.from("admin_remediation_records").select("*")
    .order("created_at", { ascending: false }).limit(filters.limit ?? 50);
  if (filters.status) query = query.eq("status", filters.status);
  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", `Failed to list remediations: ${error.message}`);
  return (data ?? []).map((r) => rowToRemediation(r as Record<string, unknown>));
}

// Support sessions
export async function insertSupportSession(
  fields: Omit<AdminSupportSession, "id" | "createdAt" | "startedAt" | "endedAt" | "status">,
  supabase: SupabaseClient,
): Promise<AdminSupportSession> {
  const { data, error } = await supabase
    .from("admin_support_sessions")
    .insert({
      admin_user_id: fields.adminUserId, target_type: fields.targetType,
      target_id: fields.targetId, purpose: fields.purpose, status: "active",
    })
    .select("*").single();
  if (error || !data) throw new AppError("INTERNAL", `Failed to create support session: ${error?.message ?? "no data"}`);
  return rowToSupportSession(data as Record<string, unknown>);
}

export async function getActiveSupportSession(
  sessionId: string, supabase: SupabaseClient,
): Promise<AdminSupportSession | null> {
  const { data, error } = await supabase
    .from("admin_support_sessions").select("*").eq("id", sessionId).eq("status", "active").maybeSingle();
  if (error) throw new AppError("INTERNAL", `Failed to read support session: ${error.message}`);
  return data ? rowToSupportSession(data as Record<string, unknown>) : null;
}

export async function closeSupportSession(
  sessionId: string, supabase: SupabaseClient,
): Promise<AdminSupportSession> {
  const { data, error } = await supabase
    .from("admin_support_sessions")
    .update({ status: "closed", ended_at: new Date().toISOString() })
    .eq("id", sessionId).select("*").single();
  if (error || !data) throw new AppError("INTERNAL", `Failed to close support session: ${error?.message ?? "no data"}`);
  return rowToSupportSession(data as Record<string, unknown>);
}
