/**
 * Create case from intake — extracted from the 247-line compensation/cases route.
 *
 * Handles: normalize input → insert case → create access row → timeline events
 * → audit log → attach unassigned documents.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { appendCaseTimelineEvent } from "@/lib/server/data";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { CompensationApplication } from "@/lib/compensationSchema";

type CaseStatus = "draft" | "ready_for_review" | "submitted" | "closed";

function normalizeApplication(raw: unknown): CompensationApplication | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as CompensationApplication;
  if (typeof raw === "string") {
    try {
      const once = JSON.parse(raw);
      if (typeof once === "object" && once) return once as CompensationApplication;
      if (typeof once === "string") {
        const twice = JSON.parse(once);
        if (typeof twice === "object" && twice) return twice as CompensationApplication;
      }
    } catch { return null; }
  }
  return null;
}

function normalizeStatus(maybe: unknown): CaseStatus {
  const allowed: CaseStatus[] = ["draft", "ready_for_review", "submitted", "closed"];
  return allowed.includes(maybe as CaseStatus) ? (maybe as CaseStatus) : "draft";
}

function normalizeStateCode(maybe: unknown): string {
  const s = typeof maybe === "string" ? maybe.trim().toUpperCase() : "";
  return ["IL", "IN"].includes(s) ? s : "IL";
}

export type CreateCaseResult = {
  case: Record<string, unknown>;
  access: { role: string; can_view: boolean; can_edit: boolean };
  warning?: string;
  permissionWarning?: string | null;
};

export async function createCaseFromIntakeSubmission(
  ctx: AuthContext,
  body: Record<string, unknown>,
  req?: Request,
): Promise<CreateCaseResult> {
  const supabase = getSupabaseAdmin();

  const rawApp = body.application ?? body;
  const application = normalizeApplication(rawApp);
  if (!application) throw new AppError("VALIDATION_ERROR", "We couldn't read your application data.", undefined, 400);

  const status = normalizeStatus(body.status);
  const state_code = normalizeStateCode(body.state_code);
  const name = typeof body.name === "string" ? (body.name as string).trim() || null : null;

  let orgId: string | null = ctx.role === "victim" ? null : (ctx.orgId ?? null);
  if (!orgId && ctx.role !== "victim") {
    const { data: legacyOrg } = await supabase.from("organizations").select("id").eq("name", "Legacy (pre-tenant)").limit(1).maybeSingle();
    orgId = legacyOrg?.id ?? null;
  }
  if (!orgId && ctx.role !== "victim") {
    throw new AppError("FORBIDDEN", "Organization membership or legacy org required to create a case", undefined, 403);
  }

  const { data: newCase, error: caseError } = await supabase
    .from("cases").insert({ owner_user_id: ctx.userId, organization_id: orgId, status, state_code, name: name ?? undefined, application })
    .select("*").single();
  if (caseError || !newCase) {
    console.error("[createCaseFromIntake] Supabase insert error:", caseError?.message, caseError?.details, caseError?.hint, caseError?.code);
    throw new AppError("INTERNAL", `Failed to save case: ${caseError?.message ?? "unknown"}`, undefined, 500);
  }

  const { error: accessError } = await supabase.from("case_access").insert({
    case_id: newCase.id, user_id: ctx.userId, organization_id: orgId, role: "owner", can_view: true, can_edit: true,
  });

  // Fire-and-forget timeline + audit
  appendCaseTimelineEvent({ caseId: newCase.id, organizationId: orgId, actor: { userId: ctx.userId, role: "owner" }, eventType: "case.created", title: "Case created", description: status !== "draft" ? `Status: ${status}` : null, metadata: { status } }).catch(() => {});
  appendCaseTimelineEvent({ caseId: newCase.id, organizationId: orgId, actor: { userId: ctx.userId, role: "owner" }, eventType: "case.intake_completed", title: "Intake completed", description: null, metadata: {} }).catch(() => {});
  logEvent({ ctx, action: "intake.completed", resourceType: "case", resourceId: newCase.id, metadata: { case_id: newCase.id, org_id: orgId ?? null }, req: req ?? null }).catch(() => {});

  // Attach unassigned documents
  const { data: attachedDocs, error: attachError } = await supabase
    .from("documents").update({ case_id: newCase.id, organization_id: orgId })
    .eq("uploaded_by_user_id", ctx.userId).is("case_id", null).select("id");

  if (attachError) {
    logger.warn("compensation.cases.create.attach_docs_failed", { caseId: newCase.id });
    return {
      case: newCase as Record<string, unknown>,
      access: { role: "owner", can_view: true, can_edit: true },
      warning: "Case saved, but failed to attach some documents.",
      permissionWarning: accessError ? "Case saved, but permission row failed." : null,
    };
  }

  const attachedCount = Array.isArray(attachedDocs) ? attachedDocs.length : 0;
  if (attachedCount > 0) {
    appendCaseTimelineEvent({ caseId: newCase.id, organizationId: orgId, actor: { userId: ctx.userId, role: "owner" }, eventType: "case.document_uploaded", title: "Documents attached to case", description: `${attachedCount} document(s) attached`, metadata: { count: attachedCount } }).catch(() => {});
  }

  return {
    case: newCase as Record<string, unknown>,
    access: { role: "owner", can_view: true, can_edit: true },
    permissionWarning: accessError ? "Case saved, but permission row failed." : null,
  };
}
