/**
 * Phase C: Recompute grading for many orgs (admin only, capped).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { evaluateOrgQualityScore } from "@/lib/server/grading/service";
import { ORG_GRADING_VERSION } from "@/lib/server/grading/config";

const MAX_ORGS = 40;

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const body = (await req.json().catch(() => ({}))) as { max_orgs?: number };
    const cap = Math.min(MAX_ORGS, Math.max(1, Number(body?.max_orgs) || 25));

    await logEvent({
      ctx,
      action: "grading.run_started",
      resourceType: "organization",
      metadata: { batch: true, score_version: ORG_GRADING_VERSION, cap },
      req,
    }).catch(() => {});

    const supabase = getSupabaseAdmin();
    const { data: orgs, error } = await supabase
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(cap);

    if (error) {
      throw new Error(error.message);
    }

    const results: Array<{ organization_id: string; overall_score: number; ok: boolean }> = [];
    for (const o of orgs ?? []) {
      const organizationId = (o as { id: string }).id;
      try {
        const { row } = await evaluateOrgQualityScore({
          organizationId,
          actorUserId: ctx.userId,
        });
        results.push({
          organization_id: organizationId,
          overall_score: row.overall_score,
          ok: true,
        });
      } catch {
        results.push({ organization_id: organizationId, overall_score: 0, ok: false });
      }
    }

    await logEvent({
      ctx,
      action: "grading.run_completed",
      metadata: {
        batch: true,
        score_version: ORG_GRADING_VERSION,
        processed: results.length,
        succeeded: results.filter((r) => r.ok).length,
      },
      req,
    }).catch(() => {});

    return apiOk({ processed: results.length, results });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.grading.run-all.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
