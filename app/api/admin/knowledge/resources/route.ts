/**
 * Admin — create a knowledge resource.
 * POST /api/admin/knowledge/resources
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createKnowledgeResource } from "@/lib/server/admin/adminService";
import type {
  KnowledgeResourceType,
  KnowledgeGeographicScope,
} from "@/lib/server/knowledge/knowledgeResourceService";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !body ||
      typeof body.title !== "string" ||
      typeof body.description !== "string" ||
      typeof body.resourceType !== "string" ||
      typeof body.geographicScope !== "string"
    ) {
      return apiFail(
        "VALIDATION_ERROR",
        "title, description, resourceType, and geographicScope are required.",
      );
    }

    const resource = await createKnowledgeResource(
      {
        userId: ctx.userId,
        accountType: ctx.accountType,
        isAdmin: true,
        organizationId: ctx.orgId ?? null,
      },
      {
        title: body.title,
        description: body.description,
        resourceType: body.resourceType as KnowledgeResourceType,
        geographicScope: body.geographicScope as KnowledgeGeographicScope,
        contactPhone: (body.contactPhone as string | null) ?? null,
        contactEmail: (body.contactEmail as string | null) ?? null,
        websiteUrl: (body.websiteUrl as string | null) ?? null,
        address: (body.address as string | null) ?? null,
        languages: Array.isArray(body.languages) ? (body.languages as string[]) : undefined,
        availability: (body.availability as string | null) ?? null,
        eligibilityNotes: (body.eligibilityNotes as string | null) ?? null,
        crimeTypesServed: Array.isArray(body.crimeTypesServed)
          ? (body.crimeTypesServed as string[])
          : undefined,
      },
    );
    return apiOk({ resource }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.knowledge.resources.post.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
