/**
 * Admin: archive an organization (operational + lifecycle); pauses public visibility.
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
      .select("id, name, status, lifecycle_status, public_profile_status")
      .eq("id", orgId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!org) {
      return apiFail("NOT_FOUND", "Organization not found", undefined, 404);
    }

    if (String(org.status ?? "") === "archived") {
      return apiOk({
        message: "Organization is already archived.",
        status: "archived",
        lifecycle_status: org.lifecycle_status ?? "archived",
        public_profile_status: org.public_profile_status ?? "paused",
        already_archived: true,
      });
    }

    const now = new Date().toISOString();
    const { error: upErr } = await supabase
      .from("organizations")
      .update({
        status: "archived",
        lifecycle_status: "archived",
        public_profile_status: "paused",
        last_profile_update: now,
      })
      .eq("id", orgId);

    if (upErr) throw new Error(upErr.message);

    await logEvent({
      ctx,
      action: "admin.org.archived",
      resourceType: "organization",
      resourceId: orgId,
      organizationId: orgId,
      metadata: {
        name: org.name,
        previous_status: org.status,
        previous_lifecycle_status: org.lifecycle_status,
        previous_public_profile_status: org.public_profile_status,
      },
      req,
    });

    logger.info("admin.org.archived", { orgId, adminId: ctx.userId });

    return apiOk({
      message:
        "Organization archived: operational and lifecycle set to archived; public profile paused.",
      status: "archived",
      lifecycle_status: "archived",
      public_profile_status: "paused",
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org.archive.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
