/**
 * Domain 5.1 — Trusted helper repository.
 * All DB access for trusted_helper_access + trusted_helper_events.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type {
  TrustedHelperAccessRow,
  TrustedHelperEventRow,
  TrustedHelperEventType,
  TrustedHelperAccessStatus,
  HelperRelationshipType,
  HelperGrantedScope,
  CreateTrustedHelperAccessInput,
} from "./trustedHelperTypes";
import { EMPTY_HELPER_SCOPE } from "./trustedHelperTypes";

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function asScopeDetail(v: unknown): HelperGrantedScope {
  if (!v || typeof v !== "object") return { ...EMPTY_HELPER_SCOPE };
  const obj = v as Record<string, unknown>;
  return {
    allowedActions: Array.isArray(obj.allowedActions) ? (obj.allowedActions as string[]) : [],
    allowedDomains: Array.isArray(obj.allowedDomains) ? (obj.allowedDomains as string[]) : [],
    caseRestriction: typeof obj.caseRestriction === "string" ? obj.caseRestriction : undefined,
    viewOnly: typeof obj.viewOnly === "boolean" ? obj.viewOnly : undefined,
  };
}

function asRow(r: Record<string, unknown>): TrustedHelperAccessRow {
  return {
    id: r.id as string,
    applicant_user_id: r.applicant_user_id as string,
    helper_user_id: r.helper_user_id as string,
    relationship_type: (r.relationship_type as HelperRelationshipType | null) ?? null,
    granted_scope: Array.isArray(r.granted_scope) ? (r.granted_scope as string[]) : [],
    granted_scope_detail: asScopeDetail(r.granted_scope_detail),
    status: r.status as TrustedHelperAccessStatus,
    granted_at: r.granted_at as string,
    accepted_at: (r.accepted_at as string | null) ?? null,
    revoked_at: (r.revoked_at as string | null) ?? null,
    expires_at: (r.expires_at as string | null) ?? null,
    granted_by_user_id: r.granted_by_user_id as string,
    notes: (r.notes as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Grant reads
// ---------------------------------------------------------------------------

export async function getTrustedHelperAccessById(
  id: string,
): Promise<TrustedHelperAccessRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("trusted_helper_access")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", "Trusted helper lookup failed", undefined, 500);
  return data ? asRow(data as Record<string, unknown>) : null;
}

export async function listTrustedHelperAccessByApplicantId(
  applicantUserId: string,
): Promise<TrustedHelperAccessRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("trusted_helper_access")
    .select("*")
    .eq("applicant_user_id", applicantUserId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("INTERNAL", "Failed to list helper grants for applicant", undefined, 500);
  return (data ?? []).map((r) => asRow(r as Record<string, unknown>));
}

export async function listTrustedHelperAccessByHelperUserId(
  helperUserId: string,
  opts?: { onlyActive?: boolean },
): Promise<TrustedHelperAccessRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("trusted_helper_access")
    .select("*")
    .eq("helper_user_id", helperUserId)
    .order("created_at", { ascending: false });
  if (opts?.onlyActive) {
    query = query.eq("status", "active");
  }
  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", "Failed to list helper grants for helper", undefined, 500);
  return (data ?? []).map((r) => asRow(r as Record<string, unknown>));
}

/**
 * Critical: the single-row lookup that powers resolveTrustedHelperScope().
 * Returns the matching active grant or null.
 */
export async function findActiveGrantForPair(params: {
  applicant_user_id: string;
  helper_user_id: string;
}): Promise<TrustedHelperAccessRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("trusted_helper_access")
    .select("*")
    .eq("applicant_user_id", params.applicant_user_id)
    .eq("helper_user_id", params.helper_user_id)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", "Active grant lookup failed", undefined, 500);
  return data ? asRow(data as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// Grant writes
// ---------------------------------------------------------------------------

export async function insertTrustedHelperAccess(
  input: CreateTrustedHelperAccessInput & { granted_by_user_id: string },
): Promise<TrustedHelperAccessRow> {
  const supabase = getSupabaseAdmin();
  // Populate both the legacy text[] column and the structured jsonb column.
  const legacyScope = input.granted_scope_detail.allowedActions ?? [];
  const { data, error } = await supabase
    .from("trusted_helper_access")
    .insert({
      applicant_user_id: input.applicant_user_id,
      helper_user_id: input.helper_user_id,
      relationship_type: input.relationship_type ?? null,
      granted_scope: legacyScope,
      granted_scope_detail: input.granted_scope_detail,
      status: "pending",
      granted_by_user_id: input.granted_by_user_id,
      notes: input.notes ?? null,
      expires_at: input.expires_at ?? null,
    })
    .select()
    .single();
  if (error) {
    throw new AppError("INTERNAL", `Failed to create helper grant: ${error.message}`, undefined, 500);
  }
  return asRow(data as Record<string, unknown>);
}

export async function updateTrustedHelperAccessStatus(params: {
  id: string;
  status: TrustedHelperAccessStatus;
  setAcceptedAt?: boolean;
  setRevokedAt?: boolean;
}): Promise<TrustedHelperAccessRow> {
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = { status: params.status };
  if (params.setAcceptedAt) update.accepted_at = new Date().toISOString();
  if (params.setRevokedAt) update.revoked_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("trusted_helper_access")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to update helper grant status", undefined, 500);
  return asRow(data as Record<string, unknown>);
}

export async function updateTrustedHelperAccessScope(params: {
  id: string;
  granted_scope_detail: HelperGrantedScope;
}): Promise<TrustedHelperAccessRow> {
  const supabase = getSupabaseAdmin();
  const legacyScope = params.granted_scope_detail.allowedActions ?? [];
  const { data, error } = await supabase
    .from("trusted_helper_access")
    .update({
      granted_scope_detail: params.granted_scope_detail,
      granted_scope: legacyScope,
    })
    .eq("id", params.id)
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to update helper grant scope", undefined, 500);
  return asRow(data as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Audit events (append-only)
// ---------------------------------------------------------------------------

export async function insertTrustedHelperEvent(params: {
  grant_id: string;
  event_type: TrustedHelperEventType;
  previous_status?: string | null;
  new_status?: string | null;
  metadata?: Record<string, unknown>;
  actor_user_id?: string | null;
}): Promise<TrustedHelperEventRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("trusted_helper_events")
    .insert({
      grant_id: params.grant_id,
      event_type: params.event_type,
      previous_status: params.previous_status ?? null,
      new_status: params.new_status ?? null,
      metadata: params.metadata ?? {},
      actor_user_id: params.actor_user_id ?? null,
    })
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to record helper event", undefined, 500);
  return data as TrustedHelperEventRow;
}

export async function listTrustedHelperEventsByGrantId(
  grantId: string,
): Promise<TrustedHelperEventRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("trusted_helper_events")
    .select("*")
    .eq("grant_id", grantId)
    .order("created_at", { ascending: true });
  if (error) throw new AppError("INTERNAL", "Failed to list helper events", undefined, 500);
  return (data ?? []) as TrustedHelperEventRow[];
}
