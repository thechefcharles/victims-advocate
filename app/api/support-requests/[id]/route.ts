/**
 * Domain 1.1 — SupportRequest: resource route.
 * GET   /api/support-requests/:id  — get a single support request
 * PATCH /api/support-requests/:id  — update mutable fields (draft only)
 *
 * Thin handler. All business logic in supportRequestService.
 */

import { getAuthContext, requireAuth, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getSupportRequest,
  updateSupportRequest,
} from "@/lib/server/supportRequests/supportRequestService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    if (!id) return apiFail("VALIDATION_ERROR", "Missing id.", undefined, 400);

    const supabase = getSupabaseAdmin();
    const result = await getSupportRequest(ctx, id, supabase);

    return apiOk(result);
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}

export async function PATCH(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    if (!id) return apiFail("VALIDATION_ERROR", "Missing id.", undefined, 400);

    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();
    const result = await updateSupportRequest(ctx, id, body, supabase);

    return apiOk(result);
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
