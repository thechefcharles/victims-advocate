/**
 * Domain 1.4 — POST /api/documents/[id]/share
 * Share a document with another org. Consent-gated — isSharingAllowed() is called in service.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { shareDocument } from "@/lib/server/documents/documentService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const { recipient_org_id, purpose, consent_grant_id } = body as Record<string, string>;
    if (!recipient_org_id || !purpose) {
      return apiFail("VALIDATION_ERROR", "recipient_org_id and purpose are required");
    }

    const supabase = getSupabaseAdmin();
    const actor = buildActor(ctx);
    const doc = await shareDocument(actor, id, { recipient_org_id, purpose, consent_grant_id }, supabase);

    return apiOk(doc);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("documents.share.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
