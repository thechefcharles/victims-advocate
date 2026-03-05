/**
 * Phase 2: List org members (org_admin, supervisor, or admin).
 */

import { NextResponse } from "next/server";
import {
  getAuthContext,
  requireAuth,
  requireOrg,
  requireOrgRole,
} from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

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
    const { data: members, error } = await supabase
      .from("org_memberships")
      .select("id, created_at, user_id, org_role, status")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Enrich with profile emails (profiles.id = user_id; email column may not exist)
    const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
    const profileMap = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        const row = p as { id: string; email?: string };
        profileMap.set(row.id, row.email ?? null);
      }
    }
    const data = (members ?? []).map((m) => ({
      ...m,
      email: profileMap.get(m.user_id) ?? null,
    }));

    return apiOk({ members: data });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.members.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
