import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listCasesForUser } from "@/lib/server/data";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildAdvocateClientDisplayName } from "@/lib/server/profile/advocateClientDisplayName";

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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ clientId: string }> }
) {
  try {
    const authCtx = await getAuthContext(req);
    requireFullAccess(authCtx, req);
    requireRole(authCtx, "advocate");

    const { clientId } = await ctx.params;
    const cleanClientId = String(clientId || "").trim();

    if (!cleanClientId) {
      return apiFail("VALIDATION_ERROR", "Missing clientId", undefined, 400);
    }

    const cases = await listCasesForUser({
      ctx: authCtx,
      filters: { role: "advocate", clientId: cleanClientId },
    });

    const formatted = cases
      .map((c: any) => ({
        id: c.id,
        created_at: c.created_at,
        status: c.status,
        state_code: c.state_code,
        application: parseApp(c.application),
        access: { can_view: c.access?.can_view, can_edit: c.access?.can_edit },
      }))
      .sort((a: any, b: any) =>
        (b.created_at || "").localeCompare(a.created_at || "")
      );

    const supabase = getSupabaseAdmin();
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("personal_info")
      .eq("id", cleanClientId)
      .maybeSingle();

    let email: string | null = null;
    try {
      const { data: udata } = await supabase.auth.admin.getUserById(cleanClientId);
      email = udata?.user?.email ?? null;
    } catch {
      // ignore
    }

    const client_display_name = buildAdvocateClientDisplayName({
      victimUserId: cleanClientId,
      personalInfoRaw: profileRow?.personal_info ?? null,
      applicationFromLatestCase: formatted[0]?.application ?? null,
      email,
    });

    logger.info("advocate.clients.cases.list", {
      userId: authCtx.userId,
      clientId: cleanClientId,
      count: formatted.length,
    });
    return NextResponse.json({ cases: formatted, client_display_name });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate.clients.cases.list.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
