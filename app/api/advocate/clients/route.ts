import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthContext, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listCasesForUser } from "@/lib/server/data";

function parseApp(app: unknown) {
  if (!app) return null;
  if (typeof app === "string") {
    try {
      return JSON.parse(app);
    } catch {
      return null;
    }
  }
  return app;
}

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
        display_name: string;
      }
    >();

    for (const row of cases) {
      const c = row as any;
      const app = parseApp(c.application);
      const first = app?.victim?.firstName?.trim?.() ?? "";
      const last = app?.victim?.lastName?.trim?.() ?? "";
      const displayName =
        first || last ? `${first} ${last}`.trim() : `Client ${(c.owner_user_id ?? "").slice(0, 8)}…`;

      const ownerId = c.owner_user_id as string;
      const createdAt = c.created_at as string;
      const existing = byOwner.get(ownerId);

      if (!existing) {
        byOwner.set(ownerId, {
          client_user_id: ownerId,
          latest_case_id: c.id,
          latest_case_created_at: createdAt,
          case_count: 1,
          display_name: displayName,
        });
      } else {
        existing.case_count += 1;
        if (createdAt && existing.latest_case_created_at && createdAt > existing.latest_case_created_at) {
          existing.latest_case_created_at = createdAt;
          existing.latest_case_id = c.id;
          existing.display_name = displayName;
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
    const victimEmails = new Map<string, string>();

    if (victimIdsToFetch.length > 0) {
      const { data: usersPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of usersPage?.users ?? []) {
        if (u.id && victimIdsToFetch.includes(u.id)) {
          victimEmails.set(u.id, u.email ?? "Unknown");
        }
      }
    }

    for (const conn of connections ?? []) {
      const victimId = conn.victim_user_id;
      if (byOwner.has(victimId)) continue;
      const email = victimEmails.get(victimId) ?? "Client";
      const updatedAt = conn.updated_at ?? new Date().toISOString();
      byOwner.set(victimId, {
        client_user_id: victimId,
        latest_case_id: "",
        latest_case_created_at: updatedAt,
        case_count: 0,
        display_name: email,
      });
    }

    const clients = Array.from(byOwner.values()).sort((a, b) =>
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
