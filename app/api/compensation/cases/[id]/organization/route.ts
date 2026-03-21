/**
 * Case owner updates which organization is linked to this case (case-specific).
 * Pass organization_id: null to reset to the platform legacy org (no victim-services org).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getCaseById } from "@/lib/server/data";
import { sameUserId } from "@/lib/server/data/ids";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getLegacyOrgId(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<string | null> {
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("name", "Legacy (pre-tenant)")
    .limit(1)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

export async function PATCH(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id: caseId } = await context.params;
    if (!caseId?.trim()) {
      return apiFail("VALIDATION_ERROR", "Missing case id", undefined, 400);
    }

    const result = await getCaseById({ caseId, ctx });
    if (!result) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }

    const ownerId = result.case.owner_user_id as string;
    if (!sameUserId(ownerId, ctx.userId)) {
      return apiFail("FORBIDDEN", "Only the case owner can change the organization", undefined, 403);
    }

    const body = await req.json().catch(() => ({}));
    const rawOrg = body?.organization_id;
    const supabase = getSupabaseAdmin();

    let targetOrgId: string;

    if (rawOrg === null || rawOrg === undefined || rawOrg === "") {
      const legacy = await getLegacyOrgId(supabase);
      if (!legacy) {
        return apiFail("INTERNAL", "Legacy organization not configured", undefined, 500);
      }
      targetOrgId = legacy;
    } else if (typeof rawOrg === "string" && rawOrg.trim()) {
      const orgId = rawOrg.trim();
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .select("id")
        .eq("id", orgId)
        .maybeSingle();
      if (orgErr || !org) {
        return apiFail("NOT_FOUND", "Organization not found", undefined, 404);
      }
      targetOrgId = orgId;
    } else {
      return apiFail("VALIDATION_ERROR", "organization_id must be a UUID string or null", undefined, 400);
    }

    const { error: caseUpdErr } = await supabase
      .from("cases")
      .update({
        organization_id: targetOrgId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId);

    if (caseUpdErr) {
      throw new AppError("INTERNAL", "Failed to update case organization", undefined, 500);
    }

    const { error: accessUpdErr } = await supabase
      .from("case_access")
      .update({ organization_id: targetOrgId })
      .eq("case_id", caseId);

    if (accessUpdErr) {
      logger.warn("compensation.cases.organization.case_access_update", {
        message: accessUpdErr.message,
        caseId,
      });
    }

    const { error: convErr } = await supabase
      .from("case_conversations")
      .update({ organization_id: targetOrgId })
      .eq("case_id", caseId);

    if (convErr) {
      logger.warn("compensation.cases.organization.conversation_update", {
        message: convErr.message,
        caseId,
      });
    }

    const { error: docErr } = await supabase
      .from("documents")
      .update({ organization_id: targetOrgId })
      .eq("case_id", caseId);

    if (docErr) {
      logger.warn("compensation.cases.organization.documents_update", {
        message: docErr.message,
        caseId,
      });
    }

    logger.info("compensation.cases.organization.updated", {
      caseId,
      organizationId: targetOrgId,
      userId: ctx.userId,
    });

    return apiOk({ organization_id: targetOrgId });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.organization.patch.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
