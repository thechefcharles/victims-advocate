/**
 * POST /api/admin/tools/support-mode — enter support mode
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { enterSupportMode } from "@/lib/server/admin/adminService";
import { serializeSupportSession } from "@/lib/server/admin/adminSerializer";
import { z } from "zod";

const body = z.object({
  target_type: z.string().min(1),
  target_id: z.string().min(1),
  purpose: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const actor = buildActor(ctx);
    const decision = await can("admin.support_mode.enter", actor, { type: "admin_tools", id: null });
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);

    const parsed = body.safeParse(await req.json());
    if (!parsed.success) return apiFail("VALIDATION_ERROR", "Invalid input.", parsed.error.flatten(), 422);

    const session = await enterSupportMode({
      adminUserId: ctx.userId,
      targetType: parsed.data.target_type,
      targetId: parsed.data.target_id,
      purpose: parsed.data.purpose,
    });
    return apiOk({ session: serializeSupportSession(session) }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("admin.support-mode.enter.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
