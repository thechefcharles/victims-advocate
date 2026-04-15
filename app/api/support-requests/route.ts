/**
 * Domain 1.1 — SupportRequest: collection route.
 * GET  /api/support-requests  — list support requests (actor-scoped)
 * POST /api/support-requests  — create a new support request
 *
 * Thin handler. All business logic in supportRequestService.
 * No inline auth checks. No inline status writes.
 */

import { getAuthContext, requireAuth, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createSupportRequest,
  listSupportRequests,
} from "@/lib/server/supportRequests/supportRequestService";
import type { SupportRequestStatus } from "@nxtstps/registry";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireFullAccess(ctx, req);

    const url = new URL(req.url);
    const status = url.searchParams.get("status") as SupportRequestStatus | null;

    const supabase = getSupabaseAdmin();
    const results = await listSupportRequests(ctx, { status: status ?? undefined }, supabase);

    return apiOk(results);
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => ({}));
    if (!body.organization_id) {
      return apiFail("VALIDATION_ERROR", "organization_id is required.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const result = await createSupportRequest(
      ctx,
      { organization_id: body.organization_id, program_id: body.program_id ?? null },
      supabase,
    );

    return apiOk(result, undefined, 201);
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
