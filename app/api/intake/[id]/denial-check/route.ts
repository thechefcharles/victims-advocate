/**
 * GET /api/intake/[id]/denial-check
 *   Runs the 13-category denial prevention check against the intake session.
 *   Auth: applicant (own session) or provider with case access.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  runDenialCheck,
  buildDenialCheckInput,
} from "@/lib/server/denialPrevention";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;

    const supabase = getSupabaseAdmin();
    const { data: session, error } = await supabase
      .from("intake_sessions")
      .select("id, owner_user_id, organization_id, state_code, draft_payload")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return apiFail("INTERNAL", "Failed to load intake session.", undefined, 500);
    }
    if (!session) return apiFail("NOT_FOUND", "Intake session not found.", undefined, 404);

    const ownerId = (session as { owner_user_id: string }).owner_user_id;
    if (!ctx.isAdmin && ownerId !== ctx.userId && ctx.accountType !== "provider") {
      return apiFail("FORBIDDEN", "Cross-user intake access denied.", undefined, 403);
    }

    const input = await buildDenialCheckInput(
      session as {
        id: string;
        state_code?: string | null;
        draft_payload?: Record<string, unknown> | null;
      },
      supabase,
    );
    const result = runDenialCheck(input);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("intake.denial_check.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
