/**
 * Phase D: Persist and retrieve org designations.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { ORG_DESIGNATION_VERSION } from "@/lib/designations/version";
import { getLatestOrgQualityScore } from "@/lib/server/grading/service";
import {
  evaluateDesignationFromGrading,
  finalizeDesignationEvaluation,
} from "./evaluate";
import type { DesignationEvaluation, OrgDesignationRow } from "./types";

function mapDesignationRow(r: Record<string, unknown>): OrgDesignationRow {
  return {
    id: String(r.id),
    created_at: String(r.created_at),
    organization_id: String(r.organization_id),
    grading_run_id: r.grading_run_id != null ? String(r.grading_run_id) : null,
    designation_version: String(r.designation_version),
    designation_tier: r.designation_tier as OrgDesignationRow["designation_tier"],
    designation_confidence: r.designation_confidence as OrgDesignationRow["designation_confidence"],
    is_current: Boolean(r.is_current),
    public_summary: r.public_summary != null ? String(r.public_summary) : null,
    category_snapshot: (r.category_snapshot as Record<string, unknown>) ?? {},
    flags: (r.flags as string[]) ?? [],
    computed_by: r.computed_by != null ? String(r.computed_by) : null,
  };
}

export async function getCurrentOrgDesignation(
  organizationId: string
): Promise<OrgDesignationRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("org_designations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_current", true)
    .maybeSingle();
  if (error || !data) return null;
  return mapDesignationRow(data as Record<string, unknown>);
}

export async function getOrgDesignationHistory(
  organizationId: string,
  limit = 15
): Promise<OrgDesignationRow[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("org_designations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => mapDesignationRow(r as Record<string, unknown>));
}

export async function computeAndPersistDesignation(params: {
  organizationId: string;
  actorUserId?: string | null;
}): Promise<{ row: OrgDesignationRow; evaluation: DesignationEvaluation }> {
  const grading = await getLatestOrgQualityScore(params.organizationId);
  const partial = evaluateDesignationFromGrading(grading);
  const evaluation = finalizeDesignationEvaluation(partial);

  const supabase = getSupabaseAdmin();
  await supabase
    .from("org_designations")
    .update({ is_current: false })
    .eq("organization_id", params.organizationId)
    .eq("is_current", true);

  const { data, error } = await supabase
    .from("org_designations")
    .insert({
      organization_id: params.organizationId,
      grading_run_id: evaluation.grading_snapshot.grading_run_id,
      designation_version: ORG_DESIGNATION_VERSION,
      designation_tier: evaluation.designation_tier,
      designation_confidence: evaluation.designation_confidence,
      is_current: true,
      public_summary: evaluation.public_summary,
      category_snapshot: evaluation.category_snapshot,
      flags: evaluation.flags,
      computed_by: params.actorUserId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to persist org designation", error, 500);
  }

  return { row: mapDesignationRow(data as Record<string, unknown>), evaluation };
}

/** Org-safe payload: no numeric grading score */
export function toPublicDesignationPayload(row: OrgDesignationRow) {
  return {
    designation_tier: row.designation_tier,
    designation_confidence: row.designation_confidence,
    public_summary: row.public_summary,
    category_snapshot: row.category_snapshot,
    flags: row.flags,
    designation_version: row.designation_version,
    updated_at: row.created_at,
    internal_preview: true as const,
  };
}
