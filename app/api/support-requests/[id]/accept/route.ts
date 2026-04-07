/**
 * Domain 1.1 — SupportRequest: accept action.
 * POST /api/support-requests/:id/accept
 */

import { getAuthContext, requireAuth, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { acceptSupportRequest } from "@/lib/server/supportRequests/supportRequestService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    if (!id) return apiFail("VALIDATION_ERROR", "Missing id.", undefined, 400);

    const supabase = getSupabaseAdmin();
    const result = await acceptSupportRequest(ctx, id, supabase);

    return apiOk(result);
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
