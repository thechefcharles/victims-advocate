/**
 * Phase E: Designation review / correction request persistence.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";

export type ReviewRequestStatus =
  | "pending"
  | "in_review"
  | "resolved_affirmed"
  | "resolved_recomputed"
  | "resolved_declined"
  | "withdrawn";

export type ReviewRequestKind = "clarification" | "correction" | "data_update";

export type DesignationReviewRequestRow = {
  id: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  requested_by_user_id: string;
  request_kind: ReviewRequestKind;
  subject: string;
  body: string;
  designation_tier_snapshot: string | null;
  designation_version_snapshot: string | null;
  status: ReviewRequestStatus;
  admin_notes_internal: string | null;
  admin_response_org_visible: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
};

function mapRow(r: Record<string, unknown>): DesignationReviewRequestRow {
  return {
    id: String(r.id),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    organization_id: String(r.organization_id),
    requested_by_user_id: String(r.requested_by_user_id),
    request_kind: r.request_kind as ReviewRequestKind,
    subject: String(r.subject),
    body: String(r.body),
    designation_tier_snapshot: r.designation_tier_snapshot != null ? String(r.designation_tier_snapshot) : null,
    designation_version_snapshot:
      r.designation_version_snapshot != null ? String(r.designation_version_snapshot) : null,
    status: r.status as ReviewRequestStatus,
    admin_notes_internal: r.admin_notes_internal != null ? String(r.admin_notes_internal) : null,
    admin_response_org_visible:
      r.admin_response_org_visible != null ? String(r.admin_response_org_visible) : null,
    resolved_by_user_id: r.resolved_by_user_id != null ? String(r.resolved_by_user_id) : null,
    resolved_at: r.resolved_at != null ? String(r.resolved_at) : null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  };
}

export async function createDesignationReviewRequest(params: {
  organizationId: string;
  requestedByUserId: string;
  requestKind: ReviewRequestKind;
  subject: string;
  body: string;
  designationTierSnapshot: string | null;
  designationVersionSnapshot: string | null;
}): Promise<DesignationReviewRequestRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("org_designation_review_requests")
    .insert({
      organization_id: params.organizationId,
      requested_by_user_id: params.requestedByUserId,
      request_kind: params.requestKind,
      subject: params.subject,
      body: params.body,
      designation_tier_snapshot: params.designationTierSnapshot,
      designation_version_snapshot: params.designationVersionSnapshot,
      status: "pending",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to create review request", error, 500);
  }
  return mapRow(data as Record<string, unknown>);
}

export async function listDesignationReviewRequestsForOrg(params: {
  organizationId: string;
  limit?: number;
}): Promise<DesignationReviewRequestRow[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("org_designation_review_requests")
    .select("*")
    .eq("organization_id", params.organizationId)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 30);
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function listDesignationReviewRequestsForAdmin(params: {
  status?: ReviewRequestStatus | "open";
  limit?: number;
}): Promise<DesignationReviewRequestRow[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("org_designation_review_requests")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(params.limit ?? 100);
  if (params.status === "open") {
    q = q.in("status", ["pending", "in_review"]);
  } else if (params.status) {
    q = q.eq("status", params.status);
  }
  const { data } = await q;
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function getDesignationReviewRequestById(id: string): Promise<DesignationReviewRequestRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("org_designation_review_requests").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function resolveDesignationReviewRequest(params: {
  id: string;
  organizationId: string;
  resolvedByUserId: string;
  newStatus: Extract<
    ReviewRequestStatus,
    "resolved_affirmed" | "resolved_recomputed" | "resolved_declined" | "in_review"
  >;
  adminNotesInternal?: string | null;
  adminResponseOrgVisible?: string | null;
}): Promise<DesignationReviewRequestRow> {
  const supabase = getSupabaseAdmin();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    status: params.newStatus,
    admin_notes_internal: params.adminNotesInternal ?? null,
    admin_response_org_visible: params.adminResponseOrgVisible ?? null,
  };
  if (
    params.newStatus === "resolved_affirmed" ||
    params.newStatus === "resolved_recomputed" ||
    params.newStatus === "resolved_declined"
  ) {
    updates.resolved_by_user_id = params.resolvedByUserId;
    updates.resolved_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from("org_designation_review_requests")
    .update(updates)
    .eq("id", params.id)
    .eq("organization_id", params.organizationId)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to update review request", error, 500);
  }
  return mapRow(data as Record<string, unknown>);
}

export async function withdrawDesignationReviewRequest(params: {
  id: string;
  organizationId: string;
  actorUserId: string;
  /** Org admin may withdraw any pending/in_review request for the org */
  asOrgAdmin: boolean;
}): Promise<DesignationReviewRequestRow> {
  const supabase = getSupabaseAdmin();
  const existing = await getDesignationReviewRequestById(params.id);
  if (!existing || existing.organization_id !== params.organizationId) {
    throw new AppError("NOT_FOUND", "Request not found", undefined, 404);
  }
  if (
    !params.asOrgAdmin &&
    existing.requested_by_user_id !== params.actorUserId
  ) {
    throw new AppError("FORBIDDEN", "Only the submitter or org admin can withdraw", undefined, 403);
  }
  if (!["pending", "in_review"].includes(existing.status)) {
    throw new AppError("VALIDATION_ERROR", "Request cannot be withdrawn", undefined, 422);
  }
  const { data, error } = await supabase
    .from("org_designation_review_requests")
    .update({
      status: "withdrawn",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to withdraw", error, 500);
  }
  return mapRow(data as Record<string, unknown>);
}
