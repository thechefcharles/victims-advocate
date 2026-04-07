/**
 * Domain 1.4 — GET /api/consents/[id]
 * Get a single consent grant. Returns { data: ConsentView, error: null }.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { getConsentGrant } from "@/lib/server/consents/consentService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const actor = buildActor(ctx);

    const grant = await getConsentGrant(actor, id, supabase);
    return NextResponse.json({ data: grant, error: null });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("consents.getById.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
