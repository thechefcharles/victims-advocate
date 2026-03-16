/**
 * Phase 5: Admin user list – id, email, role, org, account_status, created_at.
 */

import { NextResponse } from "next/server";
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
    const { data: listData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authError) throw new Error(authError.message);

    const users = listData?.users ?? [];
    const ids = users.map((u) => u.id);
    if (ids.length === 0) {
      return apiOk({ users: [] });
    }

    const { data: profiles, error: profError } = await supabase
      .from("profiles")
      .select("id, role, account_status, created_at")
      .in("id", ids);
    if (profError) throw new Error(profError.message);

    const { data: memberships } = await supabase
      .from("org_memberships")
      .select("user_id, organization_id")
      .in("user_id", ids)
      .eq("status", "active");

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const orgByUserId = new Map(
      (memberships ?? []).map((m) => [m.user_id, m.organization_id])
    );

    const list = users.map((u) => {
      const p = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        role: p?.role ?? "victim",
        orgId: orgByUserId.get(u.id) ?? null,
        account_status: p?.account_status ?? "active",
        created_at: p?.created_at ?? u.created_at,
      };
    });

    return apiOk({ users: list });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.users.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
