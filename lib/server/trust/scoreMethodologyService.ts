/**
 * Domain 6.1 — Score methodology service.
 *
 * Lifecycle:
 *   draft  →  active  →  deprecated
 *
 * Hard rules:
 *   - Only ONE active methodology at a time. Enforced at the DB level by
 *     a partial unique index on `score_methodologies (status) WHERE status='active'`.
 *   - Publishing a draft demotes the prior active row to deprecated as
 *     part of the same logical operation.
 *   - Mutating a non-draft methodology is forbidden — version a new draft.
 *   - The publish operation is a POST action on a route, never a PATCH.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type { ScoreMethodology, ScoreMethodologyCategory } from "./trustTypes";
import {
  getActiveMethodology,
  getMethodologyById,
  insertMethodology,
  listMethodologies,
  setMethodologyStatus,
  updateMethodologyDraft,
} from "./trustRepository";

export async function getActiveScoreMethodology(
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ScoreMethodology | null> {
  return getActiveMethodology(supabase);
}

export async function getScoreMethodologyById(
  id: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ScoreMethodology | null> {
  return getMethodologyById(id, supabase);
}

export async function listScoreMethodologies(
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ScoreMethodology[]> {
  return listMethodologies(supabase);
}

export interface CreateMethodologyInput {
  version: string;
  name: string;
  description?: string | null;
  categoryDefinitions: ScoreMethodologyCategory[];
  weights: Record<string, number>;
  createdByUserId: string;
}

export async function createScoreMethodology(
  input: CreateMethodologyInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ScoreMethodology> {
  if (!input.version || !input.name) {
    throw new AppError(
      "VALIDATION_ERROR",
      "version and name are required.",
      undefined,
      422,
    );
  }
  return insertMethodology(
    {
      version: input.version,
      name: input.name,
      description: input.description ?? null,
      status: "draft",
      categoryDefinitions: input.categoryDefinitions,
      weights: input.weights,
      createdByUserId: input.createdByUserId,
    },
    supabase,
  );
}

export interface UpdateMethodologyInput {
  name?: string;
  description?: string | null;
  categoryDefinitions?: ScoreMethodologyCategory[];
  weights?: Record<string, number>;
}

export async function updateScoreMethodology(
  id: string,
  input: UpdateMethodologyInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ScoreMethodology> {
  return updateMethodologyDraft(id, input, supabase);
}

/**
 * Publish a draft methodology. Demotes the prior active methodology to
 * deprecated, then activates the target. The DB partial unique index
 * means we must demote first; otherwise the activation insert/update will
 * fail with a unique-violation.
 */
export async function publishScoreMethodology(params: {
  id: string;
  supabase?: SupabaseClient;
}): Promise<ScoreMethodology> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const target = await getMethodologyById(params.id, supabase);
  if (!target) {
    throw new AppError("NOT_FOUND", "Methodology not found.", undefined, 404);
  }
  if (target.status !== "draft") {
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot publish methodology in status '${target.status}'. Only drafts can be published.`,
      undefined,
      422,
    );
  }
  // Demote the prior active row, if any.
  const prior = await getActiveMethodology(supabase);
  if (prior) {
    await setMethodologyStatus(prior.id, "deprecated", supabase);
  }
  return setMethodologyStatus(params.id, "active", supabase);
}
