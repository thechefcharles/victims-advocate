/**
 * Domain 2.3 — CVC Form Processing: legacy IN CVC PDF route (now a thin shell).
 *
 * Replaced by Domain 2.3. Business logic lives in lib/server/cvcForms/cvcOutputService.
 * URL and HTTP method preserved so existing callers continue to work.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generateCvcForm } from "@/lib/server/cvcForms";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = (await req.json().catch(() => ({}))) as { caseId?: string };
    const caseId = body.caseId;
    if (typeof caseId !== "string" || caseId.length === 0) {
      throw new AppError("VALIDATION_ERROR", "caseId is required.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const job = await generateCvcForm(ctx, caseId, supabase);

    return apiOk(job);
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
