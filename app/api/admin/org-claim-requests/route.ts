/**
 * Platform admins: list pending organization ownership claims (Phase 2).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getAdvocateDisplayForNotification } from "@/lib/server/notifications/advocateDisplay";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from("org_claim_requests")
      .select("id, submitted_at, user_id, organization_id, organizations(name)")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false });

    if (error) throw new Error(error.message);

    const claims = [];
    for (const row of rows ?? []) {
      const org = row.organizations as { name?: string } | null | undefined;
      const { displayName, email } = await getAdvocateDisplayForNotification(row.user_id as string);
      claims.push({
        id: row.id,
        submitted_at: row.submitted_at,
        user_id: row.user_id,
        organization_id: row.organization_id,
        organization_name: org?.name ?? "Organization",
        requester_display_name: displayName,
        requester_email: email,
      });
    }

    return apiOk({ claims });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org_claim_requests.list.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
