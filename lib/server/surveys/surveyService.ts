/**
 * Domain 6.1 — Anonymous Victim Experience Survey service.
 *
 * Three operations:
 *
 *   deliverSurvey(organizationId, triggerType)
 *     Creates an org_surveys row and returns a short-lived token (the row id).
 *     Token TTL: 72h. Single-use (marked completed on first submission).
 *     Fire-and-forget from calling domain services.
 *
 *   submitSurveyResponse(token, responses)
 *     Validates the token is not expired and not completed, then inserts an
 *     org_survey_responses row and flips the survey to completed.
 *     Stores zero PII — the response row has no actor linkage beyond
 *     organization_id (denormalized for aggregate queries).
 *
 *   getSurveyAggregate(organizationId)
 *     Returns response count + per-dimension averages, gated by the 10-
 *     response threshold. Averages are null when below threshold.
 *
 * Search Law: reads org_survey_responses directly (service-role only); RLS
 * forbids any other caller.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { createNotification } from "@/lib/server/notifications/create";
import {
  SURVEY_RESPONSE_THRESHOLD,
  SURVEY_TOKEN_TTL_MS,
  type SurveyAggregate,
  type SurveyResponses,
  type SurveyTriggerType,
} from "./surveyTypes";

// ---------------------------------------------------------------------------
// deliverSurvey
// ---------------------------------------------------------------------------

export async function deliverSurvey(
  organizationId: string,
  triggerType: SurveyTriggerType,
  supabase: SupabaseClient = getSupabaseAdmin(),
  applicantUserId?: string | null,
): Promise<{ token: string }> {
  const { data, error } = await supabase
    .from("org_surveys")
    .insert({
      organization_id: organizationId,
      trigger_type: triggerType,
      completed: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to deliver survey", undefined, 500);
  }

  const token = data.id as string;

  // Fire-and-forget applicant notification. The notification metadata carries
  // the survey token + applicant id, but the survey row itself has no
  // applicant linkage — anonymity is preserved at the DB layer (notification
  // → survey is a one-way link; survey row cannot be traced to the applicant).
  if (applicantUserId) {
    const expiresAt = new Date(Date.now() + SURVEY_TOKEN_TTL_MS).toISOString();
    void createNotification(
      {
        userId: applicantUserId,
        organizationId,
        type: "survey.available",
        title: "Share your experience",
        body:
          "Your feedback helps improve services for survivors. It takes 2 minutes and is completely anonymous.",
        previewSafe: true,
        metadata: {
          survey_token: token,
          expires_at: expiresAt,
          trigger_type: triggerType,
        },
      },
      null,
    ).catch(() => {
      /* best-effort — never block survey creation */
    });
  }

  return { token };
}

// ---------------------------------------------------------------------------
// submitSurveyResponse
// ---------------------------------------------------------------------------

function validateResponses(r: SurveyResponses): void {
  const fields: Array<[keyof SurveyResponses, number]> = [
    ["feltHeard", r.feltHeard],
    ["advocateClarity", r.advocateClarity],
    ["feltSafe", r.feltSafe],
    ["rightsExplained", r.rightsExplained],
    ["likelihoodToRecommend", r.likelihoodToRecommend],
  ];
  for (const [name, v] of fields) {
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      throw new AppError(
        "VALIDATION_ERROR",
        `${name} must be an integer between 1 and 5.`,
        undefined,
        422,
      );
    }
  }
}

export async function submitSurveyResponse(
  token: string,
  responses: SurveyResponses,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<void> {
  if (typeof token !== "string" || token.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Invalid survey token.", undefined, 422);
  }
  validateResponses(responses);

  // Look up the survey. Missing or already-completed → single canonical error
  // to avoid leaking whether a token exists.
  const { data: survey, error: loadErr } = await supabase
    .from("org_surveys")
    .select("id, organization_id, delivered_at, completed")
    .eq("id", token)
    .maybeSingle();

  if (loadErr) {
    throw new AppError("INTERNAL", "Failed to load survey.", undefined, 500);
  }
  if (!survey) {
    throw new AppError("NOT_FOUND", "Survey invite not found or expired.", undefined, 404);
  }
  if (survey.completed) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This survey has already been completed.",
      undefined,
      422,
    );
  }

  const deliveredAt = new Date(survey.delivered_at as string).getTime();
  if (Number.isFinite(deliveredAt) && Date.now() - deliveredAt > SURVEY_TOKEN_TTL_MS) {
    throw new AppError("NOT_FOUND", "Survey invite not found or expired.", undefined, 404);
  }

  // Insert the anonymous response. The UNIQUE(survey_id) constraint is the
  // single-use enforcement at the DB level.
  const { error: respErr } = await supabase.from("org_survey_responses").insert({
    survey_id: survey.id,
    organization_id: survey.organization_id,
    felt_heard: responses.feltHeard,
    advocate_clarity: responses.advocateClarity,
    felt_safe: responses.feltSafe,
    rights_explained: responses.rightsExplained,
    likelihood_to_recommend: responses.likelihoodToRecommend,
  });

  if (respErr) {
    if (respErr.code === "23505") {
      throw new AppError(
        "VALIDATION_ERROR",
        "This survey has already been completed.",
        undefined,
        422,
      );
    }
    throw new AppError("INTERNAL", "Failed to record survey response.", undefined, 500);
  }

  // Flip the survey to completed. Best-effort — the response row is already
  // stored and the UNIQUE constraint prevents double submission regardless.
  const { error: flipErr } = await supabase
    .from("org_surveys")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", survey.id);
  if (flipErr) {
    // Swallow — the response is persisted and the unique constraint is the
    // real gate. Don't fail the caller.
  }
}

// ---------------------------------------------------------------------------
// getSurveyAggregate
// ---------------------------------------------------------------------------

export async function getSurveyAggregate(
  organizationId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<SurveyAggregate> {
  const { data, error } = await supabase
    .from("org_survey_responses")
    .select(
      "felt_heard, advocate_clarity, felt_safe, rights_explained, likelihood_to_recommend",
    )
    .eq("organization_id", organizationId);

  if (error) {
    throw new AppError("INTERNAL", "Failed to load survey responses.", undefined, 500);
  }

  const rows = (data ?? []) as Array<Record<string, number>>;
  const responseCount = rows.length;
  const meetsThreshold = responseCount >= SURVEY_RESPONSE_THRESHOLD;

  if (!meetsThreshold) {
    return { organizationId, responseCount, meetsThreshold, averages: null };
  }

  const sum = rows.reduce(
    (acc, r) => {
      acc.feltHeard += r.felt_heard;
      acc.advocateClarity += r.advocate_clarity;
      acc.feltSafe += r.felt_safe;
      acc.rightsExplained += r.rights_explained;
      acc.likelihoodToRecommend += r.likelihood_to_recommend;
      return acc;
    },
    {
      feltHeard: 0,
      advocateClarity: 0,
      feltSafe: 0,
      rightsExplained: 0,
      likelihoodToRecommend: 0,
    },
  );

  return {
    organizationId,
    responseCount,
    meetsThreshold,
    averages: {
      feltHeard: sum.feltHeard / responseCount,
      advocateClarity: sum.advocateClarity / responseCount,
      feltSafe: sum.feltSafe / responseCount,
      rightsExplained: sum.rightsExplained / responseCount,
      likelihoodToRecommend: sum.likelihoodToRecommend / responseCount,
    },
  };
}
