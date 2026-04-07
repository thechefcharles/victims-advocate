/**
 * Domain 1.4 — POST /api/consents/[id]/revoke
 * Revoke a consent grant. Applicant only (own grant).
 * Returns { data: { revoked: true }, error: null }.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { revokeConsentGrant } from "@/lib/server/consents/consentService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();
    const actor = buildActor(ctx);

    const result = await revokeConsentGrant(actor, id, { reason: body.reason }, supabase);
    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("consents.revoke.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
