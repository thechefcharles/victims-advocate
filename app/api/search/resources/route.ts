/**
 * GET /api/search/resources — PUBLIC knowledge-catalog search.
 * Wraps knowledgeResourceService.searchResources() from Sprint 4.4.
 * No proximity math — these are regional/national resources.
 */

import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  searchResources,
  type KnowledgeResourceType,
  type KnowledgeGeographicScope,
} from "@/lib/server/knowledge/knowledgeResourceService";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const result = await searchResources({
      text: url.searchParams.get("q"),
      resourceType: (url.searchParams.get("resource_type") as KnowledgeResourceType | null) ?? null,
      geographicScope:
        (url.searchParams.get("geographic_scope") as KnowledgeGeographicScope | null) ?? null,
      language: url.searchParams.get("language"),
      crimeType: url.searchParams.get("crime_type"),
      cursor: url.searchParams.get("cursor"),
      limit: Number.parseInt(url.searchParams.get("limit") ?? "20", 10),
    });

    return apiOk(
      { resources: result.resources },
      { nextCursor: result.nextCursor },
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("search.resources.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
