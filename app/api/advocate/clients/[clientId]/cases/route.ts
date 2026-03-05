import { NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/server/auth";
import { apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ clientId: string }> }
) {
  try {
    const authCtx = await getAuthContext(req);
    requireAuth(authCtx);
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

    logger.info("advocate.clients.cases.list", {
      userId: authCtx.userId,
      clientId: cleanClientId,
      count: formatted.length,
    });
    return NextResponse.json({ cases: formatted });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate.clients.cases.list.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
