import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getResourceById } from "@/lib/server/knowledge/knowledgeResourceService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;
    const resource = await getResourceById(id);
    return apiOk({ resource });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("knowledge.resources.get.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
