/**
 * Domain 1.4 — POST /api/consents/request
 * Provider requests consent from an applicant.
 * Returns { data: { requested: true }, error: null }.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { requestConsent } from "@/lib/server/consents/consentService";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => ({}));
    const { applicant_id, linked_object_id, purpose_code } = body as Record<string, string>;

    if (!applicant_id || !linked_object_id || !purpose_code) {
      return NextResponse.json(
        { error: "applicant_id, linked_object_id, and purpose_code are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const actor = buildActor(ctx);

    const result = await requestConsent(
      actor,
      { applicantId: applicant_id, linkedObjectId: linked_object_id, purposeCode: purpose_code },
      supabase,
    );

    return NextResponse.json(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("consents.request.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
