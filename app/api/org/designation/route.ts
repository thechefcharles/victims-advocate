/**
 * Phase D: Org admin/supervisor preview of designation (no raw grading score).
 * Admins may pass ?organization_id= for the same payload shape.
 */

import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
  ORG_LEADERSHIP_ROLES,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  getCurrentOrgDesignation,
  toPublicDesignationPayload,
} from "@/lib/server/designations/service";
import { explainDesignationTier, methodologyLinks } from "@/lib/server/designations/explain";
import type { DesignationTier } from "@/lib/server/designations/types";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("organization_id")?.trim();

    let orgId: string;
    if (ctx.isAdmin && orgIdParam) {
      orgId = orgIdParam;
    } else {
      requireOrg(ctx);
      requireOrgRole(ctx, ORG_LEADERSHIP_ROLES);
      orgId = ctx.orgId!;
    }

    const row = await getCurrentOrgDesignation(orgId);
    const methodology = methodologyLinks();

    if (!row) {
      return apiOk({
        designation: null,
        message:
          "No designation on file yet. Designations are assigned when administrators refresh them after internal grading.",
        internal_preview: true,
        explanation: explainDesignationTier("insufficient_data"),
        methodology,
      });
    }

    return apiOk({
      designation: toPublicDesignationPayload(row),
      explanation: explainDesignationTier(row.designation_tier as DesignationTier),
      methodology,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.designation.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
