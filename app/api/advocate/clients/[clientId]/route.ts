/**
 * DELETE: Advocate removes themselves from a survivor’s client list—drops case_access on that
 * survivor’s cases and clears advocate_connection_requests for this pair.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiFail, apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { listCasesForUser } from "@/lib/server/data";
import { logger } from "@/lib/server/logging";
import { advocateHasClientRelationship } from "@/lib/server/profile/victimPersonalAccess";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ clientId: string }> }
) {
  try {
    const authCtx = await getAuthContext(_req);
    requireFullAccess(authCtx, _req);
    requireRole(authCtx, "advocate");

    const { clientId } = await ctx.params;
    const victimId = String(clientId || "").trim();
    if (!victimId) {
      return apiFail("VALIDATION_ERROR", "Missing client id", undefined, 400);
    }

    const allowed = await advocateHasClientRelationship(authCtx, victimId);
    if (!allowed) {
      return apiFail("FORBIDDEN", "No relationship with this client", undefined, 403);
    }

    const supabase = getSupabaseAdmin();

    const { data: connectionRows } = await supabase
      .from("advocate_connection_requests")
      .select("id")
      .eq("victim_user_id", victimId)
      .eq("advocate_user_id", authCtx.userId);

    const requestIdSet = new Set(
      (connectionRows ?? []).map((r) => String((r as { id: string }).id))
    );

    const cases = await listCasesForUser({
      ctx: authCtx,
      filters: { clientId: victimId, role: "advocate" },
    });

    for (const row of cases) {
      const caseId = String((row as { id?: string }).id ?? "");
      if (!caseId) continue;
      const { error: delAccErr } = await supabase
        .from("case_access")
        .delete()
        .eq("case_id", caseId)
        .eq("user_id", authCtx.userId)
        .eq("role", "advocate");
      if (delAccErr) {
        logger.error("advocate.client.delete.case_access", {
          message: delAccErr.message,
          caseId,
          advocateId: authCtx.userId,
        });
        throw new AppError("INTERNAL", "Failed to remove case access", undefined, 500);
      }
    }

    const { error: delConnErr } = await supabase
      .from("advocate_connection_requests")
      .delete()
      .eq("victim_user_id", victimId)
      .eq("advocate_user_id", authCtx.userId);

    if (delConnErr) {
      logger.error("advocate.client.delete.connection", {
        message: delConnErr.message,
        victimId,
        advocateId: authCtx.userId,
      });
      throw new AppError("INTERNAL", "Failed to clear connection record", undefined, 500);
    }

    const { data: connNotifs } = await supabase
      .from("notifications")
      .select("id, metadata")
      .eq("user_id", authCtx.userId)
      .eq("type", "advocate_connection_request");

    const notifIds = (connNotifs ?? [])
      .filter((row) => {
        const m = row.metadata as Record<string, unknown> | null;
        if (!m) return false;
        const vid = String(m.victim_user_id ?? "").trim();
        const rid = String(m.request_id ?? "").trim();
        if (vid === victimId) return true;
        if (rid && requestIdSet.has(rid)) return true;
        return false;
      })
      .map((row) => row.id);

    if (notifIds.length > 0) {
      const { error: notifDelErr } = await supabase.from("notifications").delete().in("id", notifIds);
      if (notifDelErr) {
        logger.error("advocate.client.delete.notifications", {
          message: notifDelErr.message,
          victimId,
        });
      }
    }

    logger.info("advocate.client.removed", {
      advocateId: authCtx.userId,
      victimId,
      casesCleared: cases.length,
      notificationsRemoved: notifIds.length,
    });

    return NextResponse.json({ ok: true, removed: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate.client.delete.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
