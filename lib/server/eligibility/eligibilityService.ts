/**
 * Domain 2.3 — Eligibility read service.
 *
 * Thin wrapper over the cases table. NO computation logic — that lives in
 * lib/eligibilitySchema.ts (IL) and lib/eligibilitySchemaIN.ts (IN), which
 * are Base Truths and not modified.
 *
 * Trust Law (AGENTS.md Rule 11): this module MUST NOT import from
 * lib/server/grading/ or lib/server/trust/. It only reads cases.eligibility_*
 * columns directly via the supabase client passed in.
 *
 * Created by Domain 2.3 to give cvcOutputService a clean way to ask
 * "has eligibility been computed for this case?" without reaching into
 * the cases table directly.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type EligibilityData = {
  result: string | null;
  readiness: string | null;
  answers: Record<string, unknown> | null;
  completedAt: string | null;
};

/**
 * Reads eligibility fields for a case. Returns nulls when no eligibility
 * has been computed yet — never throws on "not computed".
 */
export async function getEligibilityForCase(
  caseId: string,
  supabase: SupabaseClient,
): Promise<EligibilityData> {
  const { data, error } = await supabase
    .from("cases")
    .select("eligibility_result, eligibility_readiness, eligibility_answers, eligibility_completed_at")
    .eq("id", caseId)
    .maybeSingle();

  if (error) throw new Error(`getEligibilityForCase: ${error.message}`);

  const row = data as
    | {
        eligibility_result: string | null;
        eligibility_readiness: string | null;
        eligibility_answers: Record<string, unknown> | null;
        eligibility_completed_at: string | null;
      }
    | null;

  return {
    result: row?.eligibility_result ?? null,
    readiness: row?.eligibility_readiness ?? null,
    answers: row?.eligibility_answers ?? null,
    completedAt: row?.eligibility_completed_at ?? null,
  };
}

/**
 * Convenience: returns true when an eligibility result has been recorded
 * (eligibility_result is not null). Used as a hard gate by cvcOutputService.
 */
export async function isEligibilityCompleted(
  caseId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  const data = await getEligibilityForCase(caseId, supabase);
  return data.result !== null;
}
