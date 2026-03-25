/**
 * Single source of truth for moving a case to a different organization tenant.
 * Used by owner-driven PATCH and referral accept (Phase 4+).
 *
 * Phase 5: referral accept removes other leaders’ temporary review rows (see referrals service); messaging stays `can_edit`-gated.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

export async function getLegacyOrganizationId(): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("name", "Legacy (pre-tenant)")
    .limit(1)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

/**
 * Resolve PATCH body `organization_id`: null/empty → legacy org; otherwise UUID must exist.
 */
export async function resolveTargetOrganizationIdForOwnerPatch(
  rawOrganizationId: unknown
): Promise<string> {
  const supabase = getSupabaseAdmin();

  if (rawOrganizationId === null || rawOrganizationId === undefined || rawOrganizationId === "") {
    const legacy = await getLegacyOrganizationId();
    if (!legacy) {
      throw new AppError("INTERNAL", "Legacy organization not configured", undefined, 500);
    }
    return legacy;
  }

  if (typeof rawOrganizationId !== "string" || !rawOrganizationId.trim()) {
    throw new AppError(
      "VALIDATION_ERROR",
      "organization_id must be a UUID string or null",
      undefined,
      400
    );
  }

  const orgId = rawOrganizationId.trim();
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .maybeSingle();
  if (orgErr || !org) {
    throw new AppError("NOT_FOUND", "Organization not found", undefined, 404);
  }
  return orgId;
}

export type ApplyCaseOrganizationTransferResult = {
  caseId: string;
  previousOrganizationId: string | null;
  targetOrganizationId: string;
};

/**
 * Updates `cases`, `case_access`, `case_conversations`, and `documents` for the case.
 * Secondary table update failures are logged (same behavior as the original PATCH route).
 */
export async function applyCaseOrganizationTransfer(params: {
  caseId: string;
  targetOrganizationId: string;
}): Promise<ApplyCaseOrganizationTransferResult> {
  const { caseId, targetOrganizationId } = params;
  const supabase = getSupabaseAdmin();

  const { data: before, error: beforeErr } = await supabase
    .from("cases")
    .select("organization_id")
    .eq("id", caseId)
    .maybeSingle();

  if (beforeErr || !before) {
    throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
  }

  const { data: targetOrg, error: targetErr } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", targetOrganizationId)
    .maybeSingle();
  if (targetErr || !targetOrg) {
    throw new AppError("NOT_FOUND", "Organization not found", undefined, 404);
  }

  const previousOrganizationId = (before.organization_id as string | null) ?? null;

  const { error: caseUpdErr } = await supabase
    .from("cases")
    .update({
      organization_id: targetOrganizationId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  if (caseUpdErr) {
    throw new AppError("INTERNAL", "Failed to update case organization", undefined, 500);
  }

  const { error: accessUpdErr } = await supabase
    .from("case_access")
    .update({ organization_id: targetOrganizationId })
    .eq("case_id", caseId);

  if (accessUpdErr) {
    logger.warn("cases.transfer.case_access_update", {
      message: accessUpdErr.message,
      caseId,
    });
  }

  const { error: convErr } = await supabase
    .from("case_conversations")
    .update({ organization_id: targetOrganizationId })
    .eq("case_id", caseId);

  if (convErr) {
    logger.warn("cases.transfer.conversation_update", {
      message: convErr.message,
      caseId,
    });
  }

  const { error: docErr } = await supabase
    .from("documents")
    .update({ organization_id: targetOrganizationId })
    .eq("case_id", caseId);

  if (docErr) {
    logger.warn("cases.transfer.documents_update", {
      message: docErr.message,
      caseId,
    });
  }

  logger.info("cases.organization_transfer.applied", {
    caseId,
    previousOrganizationId,
    targetOrganizationId,
  });

  return { caseId, previousOrganizationId, targetOrganizationId };
}
