/**
 * Domain 1.1 — SupportRequest: decline action.
 * POST /api/support-requests/:id/decline
 * Body: { decline_reason: string }
 */

import { getAuthContext, requireAuth, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { declineSupportRequest } from "@/lib/server/supportRequests/supportRequestService";

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

    const body = await req.json().catch(() => ({}));
    if (!body.decline_reason) {
      return apiFail("VALIDATION_ERROR", "decline_reason is required.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const result = await declineSupportRequest(
      ctx,
      id,
      { decline_reason: body.decline_reason },
      supabase,
    );

    return apiOk(result);
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
