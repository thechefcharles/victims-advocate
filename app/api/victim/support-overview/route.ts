/**
 * Account-level support signals for victims (no case required):
 * pending org connect requests, pending advocate connection requests.
 */

import { getAuthContext, requireAuth, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";

const LEGACY_ORG_DISPLAY_NAME = "Legacy (pre-tenant)";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireFullAccess(ctx, req);
    requireRole(ctx, "victim");

    const supabase = getSupabaseAdmin();

    const { data: orgRows, error: orgErr } = await supabase
      .from("victim_org_connect_requests")
      .select("id, organization_id")
      .eq("victim_user_id", ctx.userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (orgErr) throw new Error(orgErr.message);

    const orgIds = [...new Set((orgRows ?? []).map((r) => r.organization_id as string).filter(Boolean))];
    const nameByOrgId = new Map<string, string>();
    if (orgIds.length > 0) {
      const { data: orgs, error: onErr } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      if (onErr) throw new Error(onErr.message);
      for (const o of orgs ?? []) {
        const raw = String((o as { name?: string }).name ?? "").trim();
        const nm =
          raw && raw !== LEGACY_ORG_DISPLAY_NAME ? raw : raw.length ? raw : "Organization";
        nameByOrgId.set((o as { id: string }).id, nm);
      }
    }

    const pending_org_connects: { id: string; organization_id: string; organization_name: string }[] = [];
    for (const row of orgRows ?? []) {
      const oid = row.organization_id as string;
      if (!oid) continue;
      pending_org_connects.push({
        id: row.id as string,
        organization_id: oid,
        organization_name: nameByOrgId.get(oid) ?? "Organization",
      });
    }

    const { data: advRows, error: advErr } = await supabase
      .from("advocate_connection_requests")
      .select("id, advocate_user_id")
      .eq("victim_user_id", ctx.userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (advErr) throw new Error(advErr.message);

    const pending_advocate_requests: { id: string; advocate_label: string }[] = [];
    for (const row of advRows ?? []) {
      const aid = row.advocate_user_id as string;
      let label = "Advocate";
      try {
        const { data: udata, error: uerr } = await supabase.auth.admin.getUserById(aid);
        if (!uerr && udata?.user?.email) label = udata.user.email;
      } catch {
        /* keep default */
      }
      pending_advocate_requests.push({ id: row.id as string, advocate_label: label });
    }

    return apiOk({
      pending_org_connects,
      advocate_connection_pending: pending_advocate_requests.length > 0,
      pending_advocate_requests,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("victim.support_overview.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
