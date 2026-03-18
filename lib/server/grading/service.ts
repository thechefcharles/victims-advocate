/**
 * Phase C: Persist and retrieve org quality scores.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { ORG_GRADING_VERSION } from "./config";
import { buildOrgScoringInputs } from "./inputs";
import { evaluateOrgQualityScoreFromInputs } from "./evaluate";
import type { GradingEvaluationResult } from "./types";
import type { OrgQualityScoreRow } from "./types";

function mapRow(r: Record<string, unknown>): OrgQualityScoreRow {
  return {
    id: String(r.id),
    created_at: String(r.created_at),
    organization_id: String(r.organization_id),
    computed_at: String(r.computed_at),
    score_version: String(r.score_version),
    overall_score: Number(r.overall_score),
    score_confidence: r.score_confidence as OrgQualityScoreRow["score_confidence"],
    category_scores: (r.category_scores as Record<string, unknown>) ?? {},
    inputs_summary: (r.inputs_summary as Record<string, unknown>) ?? {},
    flags: (r.flags as string[]) ?? [],
    status: String(r.status),
    computed_by: r.computed_by != null ? String(r.computed_by) : null,
  };
}

export async function getLatestOrgQualityScore(organizationId: string): Promise<OrgQualityScoreRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("org_quality_scores")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "current")
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getOrgQualityScoreHistory(
  organizationId: string,
  limit = 12
): Promise<OrgQualityScoreRow[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("org_quality_scores")
    .select("*")
    .eq("organization_id", organizationId)
    .order("computed_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function evaluateOrgQualityScore(params: {
  organizationId: string;
  actorUserId?: string | null;
}): Promise<{ row: OrgQualityScoreRow; evaluation: GradingEvaluationResult }> {
  const inputs = await buildOrgScoringInputs({ organizationId: params.organizationId });
  const evaluation = evaluateOrgQualityScoreFromInputs(inputs);
  const supabase = getSupabaseAdmin();

  await supabase
    .from("org_quality_scores")
    .update({ status: "superseded" })
    .eq("organization_id", params.organizationId)
    .eq("status", "current");

  const { data, error } = await supabase
    .from("org_quality_scores")
    .insert({
      organization_id: params.organizationId,
      computed_at: new Date().toISOString(),
      score_version: ORG_GRADING_VERSION,
      overall_score: evaluation.overall_score,
      score_confidence: evaluation.score_confidence,
      category_scores: evaluation.category_scores as unknown as Record<string, unknown>,
      inputs_summary: evaluation.inputs_summary,
      flags: evaluation.flags,
      status: "current",
      computed_by: params.actorUserId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to persist org quality score", error, 500);
  }

  return { row: mapRow(data as Record<string, unknown>), evaluation };
}
