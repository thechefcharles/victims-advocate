/**
 * List victim advocates (profile.role = advocate) in the caller's org.
 * Org admin, supervisor, or platform admin.
 */

import { getAuthContext, requireFullAccess, requireOrg, requireOrgRole } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const isAdmin = ctx.isAdmin;
    if (!isAdmin) {
      requireOrg(ctx);
      requireOrgRole(ctx, ["org_admin", "supervisor"]);
    }

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("organization_id")?.trim();
    const orgId = isAdmin && orgIdParam ? orgIdParam : ctx.orgId!;

    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required for admin", undefined, 422);
    }

    const supabase = getSupabaseAdmin();

    const { data: rows, error } = await supabase
      .from("org_memberships")
      .select("id, created_at, user_id, org_role, status")
      .eq("organization_id", orgId)
      .eq("status", "active");

    if (error) throw new Error(error.message);

    const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, role, email")
      .in("id", userIds);

    const profileByUser = new Map(
      (profiles ?? []).map((p: { id: string; role: string; email?: string }) => [
        p.id,
        { role: p.role, email: p.email ?? null },
      ])
    );

    const advocates = (rows ?? [])
      .filter((m) => profileByUser.get(m.user_id)?.role === "advocate")
      .map((m) => {
        const p = profileByUser.get(m.user_id);
        return {
          ...m,
          profile_role: p?.role ?? null,
          email: p?.email ?? null,
        };
      });

    return apiOk({ advocates });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.advocates.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
