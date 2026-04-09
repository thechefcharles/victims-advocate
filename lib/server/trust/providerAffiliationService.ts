/**
 * Domain 6.1 — Provider affiliation service.
 *
 * Affiliation lifecycle is platform-admin controlled. Valid statuses:
 *   pending_review | affiliated | not_affiliated | suspended
 *
 * State transitions allowed (admin paths only):
 *   pending_review → affiliated | not_affiliated | suspended
 *   affiliated     → suspended | not_affiliated
 *   not_affiliated → pending_review
 *   suspended      → affiliated | not_affiliated
 *
 * Each state change appends a new row (history-preserving) and demotes
 * the prior current row via the repository helper.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type {
  ProviderAffiliationStatus,
  ProviderAffiliationStatusType,
} from "./trustTypes";
import { getCurrentAffiliation, insertAffiliation } from "./trustRepository";

const AFFILIATION_TRANSITIONS: Record<
  ProviderAffiliationStatusType,
  ProviderAffiliationStatusType[]
> = {
  pending_review: ["affiliated", "not_affiliated", "suspended"],
  affiliated: ["suspended", "not_affiliated"],
  not_affiliated: ["pending_review"],
  suspended: ["affiliated", "not_affiliated"],
};

function assertAffiliationTransition(
  from: ProviderAffiliationStatusType | null,
  to: ProviderAffiliationStatusType,
): void {
  // Initial set: pending_review is the only legal first state.
  if (from == null) {
    if (to !== "pending_review") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Initial affiliation must be 'pending_review'.",
        undefined,
        422,
      );
    }
    return;
  }
  const allowed = AFFILIATION_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot transition affiliation from '${from}' to '${to}'.`,
      undefined,
      422,
    );
  }
}

export interface UpdateAffiliationInput {
  organizationId: string;
  toStatus: ProviderAffiliationStatusType;
  reason?: string;
  notes?: string;
  setByUserId: string;
}

export async function updateProviderAffiliation(
  input: UpdateAffiliationInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ProviderAffiliationStatus> {
  const current = await getCurrentAffiliation(input.organizationId, supabase);
  assertAffiliationTransition(current?.status ?? null, input.toStatus);
  return insertAffiliation(
    {
      organizationId: input.organizationId,
      status: input.toStatus,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      setByUserId: input.setByUserId,
    },
    supabase,
  );
}

export async function getProviderAffiliationStatus(
  organizationId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ProviderAffiliationStatus | null> {
  return getCurrentAffiliation(organizationId, supabase);
}

/**
 * Initialize affiliation for a new organization. Convenience helper that
 * sets the initial pending_review state.
 */
export async function initializeProviderAffiliation(params: {
  organizationId: string;
  setByUserId: string;
  supabase?: SupabaseClient;
}): Promise<ProviderAffiliationStatus> {
  return updateProviderAffiliation(
    {
      organizationId: params.organizationId,
      toStatus: "pending_review",
      setByUserId: params.setByUserId,
    },
    params.supabase,
  );
}
