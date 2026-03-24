/**
 * Admin: list pending organization proposals.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("pending_organization_proposals")
      .select(
        "id, created_at, created_by, status, name, type, address, phone, website, program_type, notes, resolved_at, resolved_by"
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const createdByIds = [...new Set((data ?? []).map((r) => r.created_by).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", createdByIds);

    const emailMap = new Map((profiles ?? []).map((p) => [p.id, p.email]));

    const proposals = (data ?? []).map((p) => ({
      ...p,
      created_by_email: emailMap.get(p.created_by) ?? null,
    }));

    return apiOk({ proposals });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.pending_org_proposals.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
