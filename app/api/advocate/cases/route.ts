import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listCasesForUser, listCasesForOrgRoleContext } from "@/lib/server/data";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireRole(ctx, "advocate");
    // PHASE 1: call logEvent(...) here

    const cases =
      ctx.orgId
        ? await listCasesForOrgRoleContext({ ctx })
        : await listCasesForUser({ ctx, filters: { role: "advocate" }, req });

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
