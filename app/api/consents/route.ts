/**
 * Domain 1.4 — GET/POST /api/consents
 * GET  — list own consent grants (applicant-scoped)
 * POST — create a new consent grant
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { createConsentGrant, listConsentGrants } from "@/lib/server/consents/consentService";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const supabase = getSupabaseAdmin();
    const actor = buildActor(ctx);
    const grants = await listConsentGrants(actor, ctx.userId, supabase);

    return NextResponse.json({ data: grants, error: null });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("consents.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();
    const actor = buildActor(ctx);

    const grant = await createConsentGrant(
      actor,
      {
        applicant_id: ctx.userId,
        granted_to_type: body.granted_to_type,
        granted_to_id: body.granted_to_id,
        purpose_code: body.purpose_code,
        scope: body.scope,
        expires_at: body.expires_at ?? null,
      },
      supabase,
    );

    return NextResponse.json({ data: grant, error: null }, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("consents.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
