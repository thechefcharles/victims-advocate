/**
 * Phase E: List designation review requests (admin).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listDesignationReviewRequestsForAdmin } from "@/lib/server/designations/reviewRequests";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("status") === "all" ? undefined : "open";

    const rows = await listDesignationReviewRequestsForAdmin({
      status: filter,
      limit: 150,
    });

    const supabase = getSupabaseAdmin();
    const orgIds = [...new Set(rows.map((r) => r.organization_id))];
    const orgNames = new Map<string, string>();
    if (orgIds.length) {
      const { data: orgs } = await supabase.from("organizations").select("id,name").in("id", orgIds);
      for (const o of orgs ?? []) {
        orgNames.set((o as { id: string }).id, (o as { name: string }).name);
      }
    }

    const enriched = rows.map((r) => ({
      ...r,
      organization_name: orgNames.get(r.organization_id) ?? "—",
    }));

    return apiOk({ requests: enriched });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.designation-reviews.list.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
