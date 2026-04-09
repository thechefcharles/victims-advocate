/**
 * Domain 4.1 — Referral share package service.
 * Assembles consent-governed data for the target organization.
 */

import { AppError } from "@/lib/server/api";
import type { ReferralSharePackageRow } from "./referralTypes";
import {
  getReferralById,
  createReferralSharePackage,
  getReferralSharePackageByReferralId,
} from "./referralRepository";

/**
 * Determines which data fields and documents are in scope for this referral.
 * Phase 4.1: basic scope covers referral metadata + applicant context.
 * Future phases can expand via consent scope doc_types_covered.
 */
export async function resolveReferralDataScope(_params: {
  referralId: string;
  consentGrantId?: string | null;
}): Promise<{ fieldKeys: string[]; docIds: string[] }> {
  return {
    fieldKeys: [
      "id",
      "applicant_id",
      "case_id",
      "support_request_id",
      "source_organization_id",
      "status",
      "reason",
      "created_at",
    ],
    docIds: [],
  };
}

/**
 * Assembles and persists a share package for the referral.
 * Only includes fields within the consent-governed scope.
 * Must not expose source-org-internal fields (e.g., initiated_by decision notes).
 */
export async function assembleSharePackage(params: {
  referralId: string;
  preparedBy: string;
  consentGrantId?: string | null;
}): Promise<ReferralSharePackageRow> {
  const referral = await getReferralById(params.referralId);
  if (!referral) {
    throw new AppError("NOT_FOUND", "Referral not found", undefined, 404);
  }

  const scope = await resolveReferralDataScope({
    referralId: params.referralId,
    consentGrantId: params.consentGrantId,
  });

  const scopedData: Record<string, unknown> = {};
  for (const key of scope.fieldKeys) {
    if (key in referral) {
      scopedData[key] = (referral as Record<string, unknown>)[key];
    }
  }

  return createReferralSharePackage({
    referral_id: params.referralId,
    prepared_by: params.preparedBy,
    consent_grant_id: params.consentGrantId ?? null,
    package_type: "basic",
    scoped_data: scopedData,
    doc_ids: scope.docIds,
  });
}

export async function getSharePackageForReferral(
  referralId: string,
): Promise<ReferralSharePackageRow | null> {
  return getReferralSharePackageByReferralId(referralId);
}
