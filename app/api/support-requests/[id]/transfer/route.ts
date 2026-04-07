/**
 * Domain 1.1 — SupportRequest: transfer action.
 * POST /api/support-requests/:id/transfer
 * Body: { target_organization_id: string; transfer_reason: string }
 */

import { getAuthContext, requireAuth, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { transferSupportRequest } from "@/lib/server/supportRequests/supportRequestService";

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
    if (!body.target_organization_id) {
      return apiFail("VALIDATION_ERROR", "target_organization_id is required.", undefined, 422);
    }
    if (!body.transfer_reason) {
      return apiFail("VALIDATION_ERROR", "transfer_reason is required.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const result = await transferSupportRequest(
      ctx,
      id,
      {
        target_organization_id: body.target_organization_id,
        transfer_reason: body.transfer_reason,
      },
      supabase,
    );

    return apiOk(result);
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
