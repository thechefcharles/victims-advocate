/**
 * Domain 4.1 — Referral state machine.
 *
 * validateReferralTransition() — guards all status changes.
 * validateReferralConsent()    — required gate before draft → pending_acceptance.
 *
 * Valid transitions:
 *   draft            → pending_acceptance (consent gate required), cancelled
 *   pending_acceptance → accepted, rejected, cancelled
 *   accepted         → closed
 *   rejected         → closed
 *   cancelled        → closed
 *   closed           → (terminal — no exits)
 */

import { AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { ReferralDomainStatus } from "./referralTypes";
import { REFERRAL_CONSENT_PURPOSE_CODE } from "./referralTypes";

const VALID_TRANSITIONS: Record<ReferralDomainStatus, ReferralDomainStatus[]> = {
  draft: ["pending_acceptance", "cancelled"],
  pending_acceptance: ["accepted", "rejected", "cancelled"],
  accepted: ["closed"],
  rejected: ["closed"],
  cancelled: ["closed"],
  closed: [],
};

export function validateReferralTransition(
  current: ReferralDomainStatus,
  next: ReferralDomainStatus,
): void {
  const allowed = VALID_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Referral cannot transition from '${current}' to '${next}'.`,
      undefined,
      422,
    );
  }
}

/**
 * Consent gate: must pass before draft → pending_acceptance.
 * Checks that the applicant has an active referral_share_basic consent grant.
 * If consent_grant_id is already set on the referral, validates that specific grant.
 */
export async function validateReferralConsent(referralId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: referral, error: refErr } = await supabase
    .from("referrals")
    .select("id, applicant_id, consent_grant_id")
    .eq("id", referralId)
    .maybeSingle();

  if (refErr || !referral) {
    throw new AppError("NOT_FOUND", "Referral not found", undefined, 404);
  }

  if (referral.consent_grant_id) {
    const { data: grant, error: grantErr } = await supabase
      .from("consent_grants")
      .select("id, status, purpose_code")
      .eq("id", referral.consent_grant_id)
      .maybeSingle();

    if (grantErr || !grant) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Consent grant attached to this referral could not be found.",
        undefined,
        422,
      );
    }
    if (grant.status !== "active") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Consent grant is not active. Applicant must grant active referral_share_basic consent.",
        undefined,
        422,
      );
    }
    if (grant.purpose_code !== REFERRAL_CONSENT_PURPOSE_CODE) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Consent grant does not cover referral data sharing (referral_share_basic required).",
        undefined,
        422,
      );
    }
    return;
  }

  // No consent_grant_id on the referral — look for any active referral_share_basic grant
  const { data: grants, error: grantsErr } = await supabase
    .from("consent_grants")
    .select("id, status")
    .eq("applicant_id", referral.applicant_id)
    .eq("purpose_code", REFERRAL_CONSENT_PURPOSE_CODE)
    .eq("status", "active");

  if (grantsErr) {
    throw new AppError("INTERNAL", "Failed to verify referral consent", undefined, 500);
  }

  if (!grants || grants.length === 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Referral requires active referral_share_basic consent from the applicant before it can be sent.",
      undefined,
      422,
    );
  }
}
