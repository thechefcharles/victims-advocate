/**
 * Phase 1: Admin-only audit log viewer API.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action")?.trim() || undefined;
    const actorUserId = searchParams.get("actor_user_id")?.trim() || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10) || 200, 500);

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (action) {
      query = query.eq("action", action);
    }
    if (actorUserId) {
      query = query.eq("actor_user_id", actorUserId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ logs: data ?? [] });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("audit.logs.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
