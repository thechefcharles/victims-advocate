/**
 * Advocates list their pending connection requests from victims.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthContext, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiOk, apiFailFromError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { toAppError } from "@/lib/server/api";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireRole(ctx, "advocate");

    const supabase = getSupabaseAdmin();

    const { data: rows, error } = await supabase
      .from("advocate_connection_requests")
      .select("id, victim_user_id, status, created_at")
      .eq("advocate_user_id", ctx.userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const victimIds = [...new Set((rows ?? []).map((r) => r.victim_user_id))];
    const victimEmails = new Map<string, string>();

    if (victimIds.length > 0) {
      const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      for (const u of users?.users ?? []) {
        if (u.id && victimIds.includes(u.id)) {
          victimEmails.set(u.id, u.email ?? "Unknown");
        }
      }
    }

    const requests = (rows ?? []).map((r) => ({
      id: r.id,
      victim_user_id: r.victim_user_id,
      victim_email: victimEmails.get(r.victim_user_id) ?? null,
      status: r.status,
      created_at: r.created_at,
    }));

    return apiOk({ requests });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate_connection.pending.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
