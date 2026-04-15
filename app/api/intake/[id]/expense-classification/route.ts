/**
 * GET /api/intake/[id]/expense-classification
 *   Returns payor-of-last-resort classification for each expense category
 *   the intake has claimed. Auth: applicant (own session) or provider.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  classifyExpense,
  type ExpenseCategory,
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
    const { data: session } = await supabase
      .from("intake_sessions")
      .select("id, owner_user_id, draft_payload")
      .eq("id", id)
      .maybeSingle();
    if (!session) return apiFail("NOT_FOUND", "Intake session not found.", undefined, 404);

    const ownerId = (session as { owner_user_id: string }).owner_user_id;
    if (!ctx.isAdmin && ownerId !== ctx.userId && ctx.accountType !== "provider") {
      return apiFail("FORBIDDEN", "Cross-user intake access denied.", undefined, 403);
    }

    const payload = ((session as { draft_payload?: Record<string, unknown> }).draft_payload ?? {}) as Record<string, unknown>;
    const claimed = Array.isArray((payload.expenses as { claimed?: string[] } | undefined)?.claimed)
      ? ((payload.expenses as { claimed: string[] }).claimed as string[])
      : [];
    const collateral = (payload.collateral as {
      hasInsurance?: boolean;
      insurancePaid?: boolean;
      medicaidCovered?: boolean;
      workerCompCovered?: boolean;
      disabilityInsuranceCovered?: boolean;
    } | undefined) ?? {};

    const classifications = claimed.map((category) => {
      const result = classifyExpense(category as ExpenseCategory, {
        hasInsurance: Boolean(collateral.hasInsurance),
        insurancePaid: Boolean(collateral.insurancePaid),
        medicaidCovered: Boolean(collateral.medicaidCovered),
        workerCompCovered: Boolean(collateral.workerCompCovered),
        disabilityInsuranceCovered: Boolean(collateral.disabilityInsuranceCovered),
      });
      return { category, ...result };
    });

    return apiOk({ classifications });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("intake.expense_classification.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
