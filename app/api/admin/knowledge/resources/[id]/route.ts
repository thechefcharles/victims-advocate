/**
 * Admin — update / deactivate a knowledge resource.
 *   PATCH  /api/admin/knowledge/resources/[id]   — update fields
 *   DELETE /api/admin/knowledge/resources/[id]   — deactivate (soft)
 *   POST   /api/admin/knowledge/resources/[id]/verify — mark verified
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  updateKnowledgeResource,
  deactivateKnowledgeResource,
} from "@/lib/server/admin/adminService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);
    const { id } = await context.params;
    const body = (await req.json().catch(() => null)) ?? {};
    const updated = await updateKnowledgeResource(
      {
        userId: ctx.userId,
        accountType: ctx.accountType,
        isAdmin: true,
        organizationId: ctx.orgId ?? null,
      },
      id,
      body,
    );
    return apiOk({ resource: updated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.knowledge.resources.patch.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}

export async function DELETE(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);
    const { id } = await context.params;
    const updated = await deactivateKnowledgeResource(
      {
        userId: ctx.userId,
        accountType: ctx.accountType,
        isAdmin: true,
        organizationId: ctx.orgId ?? null,
      },
      id,
    );
    return apiOk({ resource: updated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.knowledge.resources.delete.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
