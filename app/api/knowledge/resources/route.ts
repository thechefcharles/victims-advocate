/**
 * Domain 5.2 — Knowledge resource search (public catalog).
 *
 * GET /api/knowledge/resources?q=...&type=...&geo=...&lang=...&crime=...&cursor=...&limit=...
 *   Auth: requireFullAccess. Read-only, cursor paginated.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  searchResources,
  type KnowledgeResourceType,
  type KnowledgeGeographicScope,
} from "@/lib/server/knowledge/knowledgeResourceService";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const url = new URL(req.url);
    const result = await searchResources({
      text: url.searchParams.get("q"),
      resourceType: (url.searchParams.get("type") as KnowledgeResourceType | null) ?? null,
      geographicScope:
        (url.searchParams.get("geo") as KnowledgeGeographicScope | null) ?? null,
      language: url.searchParams.get("lang"),
      crimeType: url.searchParams.get("crime"),
      cursor: url.searchParams.get("cursor"),
      limit: Number.parseInt(url.searchParams.get("limit") ?? "20", 10),
    });

    return apiOk(
      { resources: result.resources },
      { nextCursor: result.nextCursor },
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("knowledge.resources.search.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
