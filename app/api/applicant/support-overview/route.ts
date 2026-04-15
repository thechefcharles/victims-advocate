/**
 * Account-level support signals for victims (no case required):
 * pending org connect requests, pending advocate connection requests.
 *
 * Defensive: each sub-query is wrapped independently. If any one fails
 * (missing table, RLS denial, transient supabase error) we return the
 * partial shape rather than 500ing the whole endpoint — the dashboard
 * banners that consume this payload can tolerate empty arrays but not a
 * 500 at page load.
 */

import { getAuthContext, requireAuth, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";

const LEGACY_ORG_DISPLAY_NAME = "Legacy (pre-tenant)";

interface PendingOrgConnect {
  id: string;
  organization_id: string;
  organization_name: string;
}
interface PendingAdvocateRequest {
  id: string;
  advocate_label: string;
}

async function loadPendingOrgConnects(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
): Promise<PendingOrgConnect[]> {
  try {
    const { data: orgRows, error: orgErr } = await supabase
      .from("victim_org_connect_requests")
      .select("id, organization_id")
      .eq("applicant_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (orgErr) {
      logger.warn("victim.support_overview.org_requests_failed", { message: orgErr.message });
      return [];
    }
    const rows = orgRows ?? [];
    const orgIds = [...new Set(rows.map((r) => r.organization_id as string).filter(Boolean))];
    const nameByOrgId = new Map<string, string>();
    if (orgIds.length > 0) {
      const { data: orgs, error: onErr } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      if (onErr) {
        logger.warn("victim.support_overview.org_names_failed", { message: onErr.message });
      } else {
        for (const o of orgs ?? []) {
          const raw = String((o as { name?: string }).name ?? "").trim();
          const nm =
            raw && raw !== LEGACY_ORG_DISPLAY_NAME ? raw : raw.length ? raw : "Organization";
          nameByOrgId.set((o as { id: string }).id, nm);
        }
      }
    }
    const out: PendingOrgConnect[] = [];
    for (const row of rows) {
      const oid = row.organization_id as string;
      if (!oid) continue;
      out.push({
        id: row.id as string,
        organization_id: oid,
        organization_name: nameByOrgId.get(oid) ?? "Organization",
      });
    }
    return out;
  } catch (err) {
    logger.warn("victim.support_overview.org_requests_threw", {
      message: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

async function loadPendingAdvocateRequests(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
): Promise<PendingAdvocateRequest[]> {
  try {
    const { data: advRows, error: advErr } = await supabase
      .from("advocate_connection_requests")
      .select("id, advocate_user_id")
      .eq("applicant_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (advErr) {
      logger.warn("victim.support_overview.advocate_requests_failed", {
        message: advErr.message,
      });
      return [];
    }
    const out: PendingAdvocateRequest[] = [];
    for (const row of advRows ?? []) {
      const aid = row.advocate_user_id as string;
      let label = "Advocate";
      try {
        const { data: udata, error: uerr } = await supabase.auth.admin.getUserById(aid);
        if (!uerr && udata?.user?.email) label = udata.user.email;
      } catch {
        /* keep default */
      }
      out.push({ id: row.id as string, advocate_label: label });
    }
    return out;
  } catch (err) {
    logger.warn("victim.support_overview.advocate_requests_threw", {
      message: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireFullAccess(ctx, req);
    requireRole(ctx, "victim");

    const supabase = getSupabaseAdmin();
    const [pending_org_connects, pending_advocate_requests] = await Promise.all([
      loadPendingOrgConnects(supabase, ctx.userId),
      loadPendingAdvocateRequests(supabase, ctx.userId),
    ]);

    return apiOk({
      pending_org_connects,
      advocate_connection_pending: pending_advocate_requests.length > 0,
      pending_advocate_requests,
    });
  } catch (err) {
    const appErr = toAppError(err);
    // Only auth/role errors propagate. Data-layer failures are absorbed by
    // the per-loader helpers above so the surface never emits a 500 for a
    // missing table or transient supabase blip.
    logger.error("victim.support_overview.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
