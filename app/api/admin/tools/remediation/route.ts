/**
 * GET  /api/admin/tools/remediation — list remediation records
 * POST /api/admin/tools/remediation — create remediation record
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getRemediationRecords, remediateOrganization } from "@/lib/server/admin/adminService";
import { serializeRemediation } from "@/lib/server/admin/adminSerializer";
import { z } from "zod";

const createBody = z.object({
  organization_id: z.string().uuid(),
  remediation_type: z.string().min(1),
  issue_context: z.string().min(1),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const actor = buildActor(ctx);
    const decision = await can("admin.organization.inspect", actor, { type: "admin_tools", id: null });
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);

    const url = new URL(req.url);
    const records = await getRemediationRecords({
      status: url.searchParams.get("status") ?? undefined,
    });
    return apiOk({ records: records.map(serializeRemediation) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("admin.remediation.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const actor = buildActor(ctx);
    const decision = await can("admin.organization.remediate", actor, { type: "admin_tools", id: null });
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);

    const parsed = createBody.safeParse(await req.json());
    if (!parsed.success) return apiFail("VALIDATION_ERROR", "Invalid input.", parsed.error.flatten(), 422);

    const record = await remediateOrganization({
      adminUserId: ctx.userId,
      organizationId: parsed.data.organization_id,
      remediationType: parsed.data.remediation_type,
      issueContext: parsed.data.issue_context,
      notes: parsed.data.notes,
    });
    return apiOk({ record: serializeRemediation(record) }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("admin.remediation.create.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
