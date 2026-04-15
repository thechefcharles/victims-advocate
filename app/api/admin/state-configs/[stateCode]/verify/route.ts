/**
 * POST /api/admin/state-configs/[stateCode]/verify
 *   Body: { verificationNotes: string }
 * Marks the resolved state_workflow_configs row as human_verified=true.
 * Admin only.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { verifyStateConfig } from "@/lib/server/stateConfig/verifyStateConfig";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ stateCode: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only.", undefined, 403);
    }
    const { stateCode } = await context.params;
    const body = (await req.json().catch(() => ({}))) as {
      verificationNotes?: unknown;
    };
    const notes = typeof body.verificationNotes === "string" ? body.verificationNotes : "";
    const result = await verifyStateConfig(ctx, stateCode, notes);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.state_configs.verify.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
