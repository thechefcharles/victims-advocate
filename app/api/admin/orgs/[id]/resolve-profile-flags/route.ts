/**
 * Admin: mark unresolved sensitive profile flags as reviewed (reduces list clutter; audit remains).
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
      return apiFail("VALIDATION_ERROR", "Invalid organization id", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: updated, error: upErr } = await supabase
      .from("organization_profile_flags")
      .update({ resolved: true, resolved_at: now })
      .eq("organization_id", orgId)
      .eq("resolved", false)
      .eq("flag_type", "sensitive_change")
      .select("id");

    if (upErr) throw new Error(upErr.message);

    const count = updated?.length ?? 0;

    if (count > 0) {
      await logEvent({
        ctx,
        action: "admin.org.profile_flags_resolved",
        resourceType: "organization",
        resourceId: orgId,
        organizationId: orgId,
        metadata: { flags_marked_resolved: count },
        req,
      });
    }

    logger.info("admin.org.profile_flags_resolved", { orgId, count, adminId: ctx.userId });

    return apiOk({
      message:
        count === 0
          ? "No unresolved sensitive-change flags for this organization."
          : `Marked ${count} flag(s) as reviewed.`,
      resolved_count: count,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org.resolve_profile_flags.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
