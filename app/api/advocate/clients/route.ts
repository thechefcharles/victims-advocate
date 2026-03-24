import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthContext, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listCasesForUser } from "@/lib/server/data";
import { buildAdvocateClientDisplayName } from "@/lib/server/profile/advocateClientDisplayName";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireRole(ctx, "advocate");
    // PHASE 1: call logEvent(...) here

    const cases = await listCasesForUser({ ctx, filters: { role: "advocate" } });
    const supabase = getSupabaseAdmin();

    const byOwner = new Map<
      string,
      {
        client_user_id: string;
        latest_case_id: string;
        latest_case_created_at: string;
        case_count: number;
        /** Latest shared case application — fallback label when account name is empty. */
        latest_application: unknown | null;
      }
    >();

    for (const row of cases) {
      const c = row as Record<string, unknown>;
      const ownerId = c.owner_user_id as string;
      const createdAt = c.created_at as string;
      const existing = byOwner.get(ownerId);

      if (!existing) {
        byOwner.set(ownerId, {
          client_user_id: ownerId,
          latest_case_id: c.id as string,
          latest_case_created_at: createdAt,
          case_count: 1,
          latest_application: c.application ?? null,
        });
      } else {
        existing.case_count += 1;
        if (createdAt && existing.latest_case_created_at && createdAt > existing.latest_case_created_at) {
          existing.latest_case_created_at = createdAt;
          existing.latest_case_id = c.id as string;
          existing.latest_application = c.application ?? null;
        }
      }
    }

    // Include victims from accepted connection requests (even without a case)
    const { data: connections } = await supabase
      .from("advocate_connection_requests")
      .select("victim_user_id, updated_at")
      .eq("advocate_user_id", ctx.userId)
      .eq("status", "accepted");

    const victimIdsToFetch = (connections ?? [])
      .map((r) => r.victim_user_id)
      .filter((id) => !byOwner.has(id));

    const allVictimIds = Array.from(byOwner.keys());
    if (victimIdsToFetch.length > 0) {
      for (const id of victimIdsToFetch) {
        if (!allVictimIds.includes(id)) allVictimIds.push(id);
      }
    }

    const victimEmails = new Map<string, string>();
    const { data: usersPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of usersPage?.users ?? []) {
      if (u.id && allVictimIds.includes(u.id) && u.email) {
        victimEmails.set(u.id, u.email);
      }
    }

    for (const conn of connections ?? []) {
      const victimId = conn.victim_user_id as string;
      if (byOwner.has(victimId)) continue;
      const updatedAt = conn.updated_at ?? new Date().toISOString();
      byOwner.set(victimId, {
        client_user_id: victimId,
        latest_case_id: "",
        latest_case_created_at: updatedAt,
        case_count: 0,
        latest_application: null,
      });
    }

    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, personal_info")
      .in("id", Array.from(byOwner.keys()));

    const personalInfoByUserId = new Map<string, unknown>();
    for (const row of profileRows ?? []) {
      personalInfoByUserId.set(row.id as string, row.personal_info);
    }

    const clients = Array.from(byOwner.values())
      .map((row) => ({
        client_user_id: row.client_user_id,
        latest_case_id: row.latest_case_id,
        latest_case_created_at: row.latest_case_created_at,
        case_count: row.case_count,
        display_name: buildAdvocateClientDisplayName({
          victimUserId: row.client_user_id,
          personalInfoRaw: personalInfoByUserId.get(row.client_user_id) ?? null,
          applicationFromLatestCase: row.latest_application,
          email: victimEmails.get(row.client_user_id) ?? null,
        }),
      }))
      .sort((a, b) =>
        (b.latest_case_created_at || "").localeCompare(a.latest_case_created_at || "")
      );

    logger.info("advocate.clients.list", { userId: ctx.userId, count: clients.length });
    return NextResponse.json({ clients });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate.clients.list.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
