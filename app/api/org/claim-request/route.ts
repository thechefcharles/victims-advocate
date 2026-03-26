/**
 * Organization leaders: request ownership of an existing org (e.g. directory listing already has a workspace).
 * Requires platform admin approval — does not create org_owner immediately.
 * Use when the org has no active org_owner; if it already has owners, use POST /api/org/request-to-join.
 */

import { getAuthContext, requireAuth, requireActiveAccount } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireActiveAccount(ctx, req);

    if (!ctx.isAdmin && ctx.realRole !== "organization") {
      return apiFail(
        "FORBIDDEN",
        "Only organization leader accounts can submit an ownership request.",
        undefined,
        403
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }

    const rawOrgId = (body as { organization_id?: unknown }).organization_id;
    const organizationId =
      typeof rawOrgId === "string" && UUID_RE.test(rawOrgId.trim()) ? rawOrgId.trim() : null;

    if (!organizationId) {
      return apiFail("VALIDATION_ERROR", "organization_id must be a valid UUID", undefined, 422);
    }

    const supabase = getSupabaseAdmin();

    const { data: existingMem } = await supabase
      .from("org_memberships")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("status", "active")
      .maybeSingle();

    if (existingMem) {
      return apiFail(
        "VALIDATION_ERROR",
        "You already belong to an organization. Leave it before requesting ownership of another.",
        undefined,
        400
      );
    }

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, status")
      .eq("id", organizationId)
      .maybeSingle();

    if (orgErr) throw new Error(orgErr.message);
    if (!org || org.status !== "active") {
      return apiFail("NOT_FOUND", "Organization not found", undefined, 404);
    }

    const { count: ownerCount, error: ownerErr } = await supabase
      .from("org_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .eq("org_role", "org_owner");

    if (ownerErr) throw new Error(ownerErr.message);
    if ((ownerCount ?? 0) > 0) {
      return apiFail(
        "ORG_ALREADY_HAS_OWNER",
        "This organization already has an owner. Use Request To Join to ask for access instead.",
        undefined,
        409
      );
    }

    const { data: claimRow, error: claimErr } = await supabase
      .from("org_claim_requests")
      .insert({
        organization_id: organizationId,
        user_id: ctx.userId,
        status: "pending",
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (claimErr) {
      if (claimErr.code === "23505") {
        return apiFail(
          "DUPLICATE_CLAIM",
          "You already have a pending ownership request for this organization.",
          undefined,
          409
        );
      }
      throw new Error(claimErr.message);
    }

    await logEvent({
      ctx,
      action: "org.claim_request.submitted",
      resourceType: "org_claim_request",
      resourceId: claimRow.id,
      organizationId,
      metadata: { organization_name: org.name },
      req,
    });

    logger.info("org.claim_request.created", {
      userId: ctx.userId,
      organizationId,
      claimId: claimRow.id,
    });

    return apiOk({
      id: claimRow.id,
      organization_id: organizationId,
      message: "Your ownership request was submitted. A platform administrator will review it.",
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.claim_request.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
