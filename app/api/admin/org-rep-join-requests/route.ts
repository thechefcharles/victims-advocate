/**
 * Platform admins: list pending org representative join requests (directory “Request To Join” flow).
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
      .from("org_rep_join_requests")
      .select("id, created_at, user_id, organization_id, organizations(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const requests = [];
    for (const row of rows ?? []) {
      const org = row.organizations as { name?: string } | null | undefined;
      const { displayName, email } = await getAdvocateDisplayForNotification(row.user_id as string);
      requests.push({
        id: row.id,
        created_at: row.created_at,
        user_id: row.user_id,
        organization_id: row.organization_id,
        organization_name: org?.name ?? "Organization",
        requester_display_name: displayName,
        requester_email: email,
      });
    }

    return apiOk({ requests });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org_rep_join_requests.list.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
