/**
 * Phase 3: Admin approves public activation — public_profile_status → active.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import {
  isOrganizationManaged,
  parseOrgPublicProfileStatus,
} from "@/lib/server/organizations/state";
import { organizationRowToProfileRow } from "@/lib/server/organizations/profile";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const { id: raw } = await params;
    const orgId = raw?.trim();
    if (!orgId || !UUID_RE.test(orgId)) {
      return apiFail("VALIDATION_ERROR", "Invalid organization id", undefined, 422);
    }

    const supabase = getSupabaseAdmin();

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle();

    if (orgErr) throw new Error(orgErr.message);
    if (!org) {
      return apiFail("NOT_FOUND", "Organization not found", undefined, 404);
    }

    const row = org as Record<string, unknown>;
    if (String(row.status ?? "") !== "active") {
      return apiFail(
        "VALIDATION_ERROR",
        "Only active organizations can be activated for public visibility.",
        undefined,
        422
      );
    }

    if (!isOrganizationManaged({ lifecycle_status: row.lifecycle_status as string })) {
      return apiFail(
        "VALIDATION_ERROR",
        "Organization must have confirmed ownership (managed lifecycle) before activation.",
        undefined,
        422
      );
    }

    const { count, error: cntErr } = await supabase
      .from("org_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "active")
      .eq("org_role", "org_owner");

    if (cntErr) throw new Error(cntErr.message);
    if ((count ?? 0) < 1) {
      return apiFail(
        "VALIDATION_ERROR",
        "Cannot activate: organization has no active organization owner.",
        undefined,
        422
      );
    }

    const pub = parseOrgPublicProfileStatus(row.public_profile_status);
    if (pub === "active") {
      const out = organizationRowToProfileRow(row);
      const { metadata: _m, ...profileRest } = out;
      return apiOk({
        message: "Organization is already publicly active.",
        profile: profileRest,
        already_active: true,
      });
    }
    if (pub !== "pending_review") {
      return apiFail(
        "VALIDATION_ERROR",
        "Organization must be submitted for review (pending_review) before activation.",
        undefined,
        422
      );
    }

    const { data: updated, error: upErr } = await supabase
      .from("organizations")
      .update({ public_profile_status: "active" })
      .eq("id", orgId)
      .select("*")
      .single();

    if (upErr || !updated) {
      throw new Error(upErr?.message ?? "Failed to activate organization");
    }

    await logEvent({
      ctx,
      action: "org.activation.approved",
      resourceType: "organization",
      resourceId: orgId,
      organizationId: orgId,
      metadata: {
        name: row.name,
        public_profile_status: "active",
      },
      req,
    });

    logger.info("org.activation.approved", { orgId, adminId: ctx.userId });

    const out = organizationRowToProfileRow(updated as Record<string, unknown>);
    const { metadata: _m, ...profileRest } = out;

    return apiOk({
      message: "Organization is now publicly active (visibility rules apply when enforcement is enabled).",
      profile: profileRest,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org.activate.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
