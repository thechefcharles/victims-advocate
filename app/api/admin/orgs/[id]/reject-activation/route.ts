/**
 * Phase 3: Admin rejects or sends back an activation request — public_profile_status → draft.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
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

    const body = await req.json().catch(() => ({}));
    const note =
      typeof (body as { note?: unknown })?.note === "string"
        ? String((body as { note: string }).note).trim().slice(0, 2000) || null
        : null;

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
    const pub = String(row.public_profile_status ?? "draft");
    if (pub !== "pending_review") {
      return apiFail(
        "VALIDATION_ERROR",
        "Organization is not awaiting activation review.",
        undefined,
        409
      );
    }

    const { data: updated, error: upErr } = await supabase
      .from("organizations")
      .update({
        public_profile_status: "draft",
        activation_submitted_at: null,
      })
      .eq("id", orgId)
      .select("*")
      .single();

    if (upErr || !updated) {
      throw new Error(upErr?.message ?? "Failed to update organization");
    }

    await logEvent({
      ctx,
      action: "org.activation.rejected",
      resourceType: "organization",
      resourceId: orgId,
      organizationId: orgId,
      metadata: {
        name: row.name,
        note,
        public_profile_status: "draft",
      },
      req,
    });

    logger.info("org.activation.rejected", { orgId, adminId: ctx.userId });

    const out = organizationRowToProfileRow(updated as Record<string, unknown>);
    const { metadata: _m, ...profileRest } = out;

    return apiOk({
      message: "Activation request returned to draft. The organization leader can update and resubmit.",
      profile: profileRest,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org.reject_activation.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
