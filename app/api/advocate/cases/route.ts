import { NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listCasesForUser } from "@/lib/server/data";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireRole(ctx, "advocate");
    // PHASE 1: call logEvent(...) here

    const cases = await listCasesForUser({ ctx, filters: { role: "advocate" } });

    const plainCases = cases.map((c: any) => c);
    logger.info("advocate.cases.list", { userId: ctx.userId, count: plainCases.length });
    return NextResponse.json({ cases: plainCases });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate.cases.list.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
