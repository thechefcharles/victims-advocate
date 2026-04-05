/**
 * Admin: resume public org profile visibility (public_profile_status → active from paused).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";

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
      return apiFail("VALIDATION_ERROR", "We couldn't match that organization. Open it again from your list or dashboard.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { data: org, error: fetchErr } = await supabase
      .from("organizations")
      .select("id, name, status, public_profile_status")
      .eq("id", orgId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!org) {
      return apiFail("NOT_FOUND", "Organization not found", undefined, 404);
    }

    if (String(org.status ?? "") === "archived") {
      return apiFail(
        "VALIDATION_ERROR",
        "Unarchive the organization operationally before resuming public visibility.",
        undefined,
        409
      );
    }

    const pub = String(org.public_profile_status ?? "draft");
    if (pub !== "paused") {
      return apiFail(
        "VALIDATION_ERROR",
        "Resume applies when public profile is paused. Use activation workflow for draft or pending review.",
        undefined,
        422
      );
    }

    const { error: upErr } = await supabase
      .from("organizations")
      .update({ public_profile_status: "active" })
      .eq("id", orgId);

    if (upErr) throw new Error(upErr.message);

    await logEvent({
      ctx,
      action: "admin.org.public_profile_resumed",
      resourceType: "organization",
      resourceId: orgId,
      organizationId: orgId,
      metadata: {
        name: org.name,
        from_public_profile_status: "paused",
        to_public_profile_status: "active",
      },
      req,
    });

    logger.info("admin.org.public_profile_resumed", { orgId, adminId: ctx.userId });

    return apiOk({
      message: "Public organization profile is active again.",
      public_profile_status: "active",
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org.resume.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
