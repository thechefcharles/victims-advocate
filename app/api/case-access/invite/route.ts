import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFail, apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    // PHASE 1: call logEvent(...) here

    const body = await req.json().catch(() => ({}));
    const { caseId, advocateEmail, canEdit } = body;

    const cleanCaseId = String(caseId || "").trim();
    const cleanEmail = String(advocateEmail || "").toLowerCase().trim();
    const allowEdit = Boolean(canEdit);

    if (!cleanCaseId || !cleanEmail) {
      return apiFail(
        "VALIDATION_ERROR",
        "Missing caseId or advocateEmail",
        undefined,
        400
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: caseRow, error: caseErr } = await supabaseAdmin
      .from("cases")
      .select("id, organization_id")
      .eq("id", cleanCaseId)
      .maybeSingle();

    if (caseErr || !caseRow) {
      return apiFail("NOT_FOUND", "Case not found", undefined, 404);
    }

    const caseOrgId = caseRow.organization_id as string | null;
    const allowed =
      ctx.isAdmin || (ctx.orgId && caseOrgId && ctx.orgId === caseOrgId);
    if (!allowed) {
      return apiFail("FORBIDDEN", "Forbidden", undefined, 403);
    }

    const { data: callerAccess, error: callerErr } = await supabaseAdmin
      .from("case_access")
      .select("role, can_edit")
      .eq("case_id", cleanCaseId)
      .eq("user_id", ctx.userId)
      .maybeSingle();

    if (callerErr) {
      throw new AppError("INTERNAL", "Permission check failed", undefined, 500);
    }

    if (!callerAccess || callerAccess.role !== "owner" || !callerAccess.can_edit) {
      return apiFail("FORBIDDEN", "Forbidden", undefined, 403);
    }

    const { data: usersPage, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listErr) {
      throw new AppError("INTERNAL", "Advocate lookup failed", undefined, 500);
    }

    const match = usersPage?.users?.find(
      (u) => (u.email || "").toLowerCase() === cleanEmail
    );

    if (!match?.id) {
      return apiFail(
        "NOT_FOUND",
        "No account found for that email. Ask the advocate to create an account first.",
        undefined,
        404
      );
    }

    const advocateUserId = match.id;

    const { error: upsertErr } = await supabaseAdmin
      .from("case_access")
      .upsert(
        {
          case_id: cleanCaseId,
          user_id: advocateUserId,
          organization_id: caseOrgId,
          role: "advocate",
          can_view: true,
          can_edit: allowEdit,
        },
        { onConflict: "case_id,user_id" }
      );

    if (upsertErr) {
      throw new AppError("INTERNAL", "Failed to grant access", undefined, 500);
    }

    logger.info("case_access.invite", {
      caseId: cleanCaseId,
      inviterId: ctx.userId,
      advocateId: advocateUserId,
    });
    return NextResponse.json({
      ok: true,
      shareUrl: `/compensation/intake?case=${cleanCaseId}`,
      advocateUserId,
      canEdit: allowEdit,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("case_access.invite.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
