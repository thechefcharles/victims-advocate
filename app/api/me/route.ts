/**
 * Phase 2: Returns current auth context for client (role, org, etc).
 */

import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { apiFail, apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) {
      return apiFail("AUTH_REQUIRED", "Unauthorized", undefined, 401);
    }

    return apiOk({
      userId: ctx.userId,
      email: ctx.user.email ?? null,
      role: ctx.role,
      realRole: ctx.realRole ?? ctx.role,
      isAdmin: ctx.isAdmin,
      orgId: ctx.orgId,
      orgRole: ctx.orgRole,
      affiliatedCatalogEntryId: ctx.affiliatedCatalogEntryId,
      organizationCatalogEntryId: ctx.organizationCatalogEntryId,
      emailVerified: ctx.emailVerified,
      accountStatus: ctx.accountStatus,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("me.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
