/**
 * Phase E: Resolve designation review request (admin).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import {
  getDesignationReviewRequestById,
  resolveDesignationReviewRequest,
} from "@/lib/server/designations/reviewRequests";
import { computeAndPersistDesignation } from "@/lib/server/designations/service";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteCtx) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const { id } = await params;
    const requestId = id?.trim();
    if (!requestId) {
      return apiFail("VALIDATION_ERROR", "That link or ID doesn't look right. Go back and try again.", undefined, 422);
    }

    const existing = await getDesignationReviewRequestById(requestId);
    if (!existing) {
      return apiFail("NOT_FOUND", "Request not found", undefined, 404);
    }
    if (!["pending", "in_review"].includes(existing.status)) {
      return apiFail("VALIDATION_ERROR", "Request is already closed", undefined, 422);
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const resolution = String(body?.resolution ?? "").trim();
    const adminResponse = String(body?.admin_response_org_visible ?? "").trim();
    const adminNotes = body?.admin_notes_internal != null ? String(body.admin_notes_internal).trim() : "";

    const allowed = ["mark_in_review", "affirm", "recompute_designation", "decline"];
    if (!allowed.includes(resolution)) {
      return apiFail(
        "VALIDATION_ERROR",
        "resolution must be mark_in_review, affirm, recompute_designation, or decline",
        undefined,
        422
      );
    }

    if (resolution !== "mark_in_review" && adminResponse.length < 10) {
      return apiFail(
        "VALIDATION_ERROR",
        "admin_response_org_visible (min 10 chars) required when closing a request",
        undefined,
        422
      );
    }

    if (resolution === "mark_in_review") {
      const row = await resolveDesignationReviewRequest({
        id: requestId,
        organizationId: existing.organization_id,
        resolvedByUserId: ctx.userId,
        newStatus: "in_review",
        adminNotesInternal: adminNotes || null,
        adminResponseOrgVisible: null,
      });
      logEvent({
        ctx,
        action: "designation.review_resolved",
        resourceType: "designation_review_request",
        resourceId: requestId,
        organizationId: existing.organization_id,
        metadata: { action: "marked_in_review", request_id: requestId },
        req,
      }).catch(() => {});
      return apiOk({ request: row });
    }

    let newStatus: "resolved_affirmed" | "resolved_recomputed" | "resolved_declined";
    if (resolution === "affirm") newStatus = "resolved_affirmed";
    else if (resolution === "recompute_designation") newStatus = "resolved_recomputed";
    else newStatus = "resolved_declined";

    if (resolution === "recompute_designation") {
      try {
        await computeAndPersistDesignation({
          organizationId: existing.organization_id,
          actorUserId: ctx.userId,
        });
      } catch (e) {
        throw new AppError(
          "INTERNAL",
          "Designation recompute failed: " + String((e as Error)?.message ?? e),
          undefined,
          500
        );
      }
    }

    const row = await resolveDesignationReviewRequest({
      id: requestId,
      organizationId: existing.organization_id,
      resolvedByUserId: ctx.userId,
      newStatus,
      adminNotesInternal: adminNotes || null,
      adminResponseOrgVisible: adminResponse,
    });

    logEvent({
      ctx,
      action: "designation.review_resolved",
      resourceType: "designation_review_request",
      resourceId: requestId,
      organizationId: existing.organization_id,
      metadata: {
        resolution: newStatus,
        recomputed: resolution === "recompute_designation",
        request_id: requestId,
      },
      req,
    }).catch(() => {});

    return apiOk({ request: row });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.designation-reviews.patch.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
