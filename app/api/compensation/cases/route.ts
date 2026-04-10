/**
 * GET  /api/compensation/cases — List cases for current user/org.
 * POST /api/compensation/cases — Create case from intake submission.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listCasesForUser, listCasesForOrgRoleContext } from "@/lib/server/data";
import { createCaseFromIntakeSubmission } from "@/lib/server/cases/createCaseFromIntake";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const cases =
      (ctx.role === "advocate" || ctx.role === "organization") && ctx.orgId
        ? await listCasesForOrgRoleContext({ ctx })
        : await listCasesForUser({ ctx, req });
    logger.info("compensation.cases.list", { userId: ctx.userId, count: cases.length });
    return NextResponse.json({ cases });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body) return apiFail("VALIDATION_ERROR", "We couldn't read that request.", undefined, 400);

    const result = await createCaseFromIntakeSubmission(ctx, body as Record<string, unknown>, req);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.create.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
