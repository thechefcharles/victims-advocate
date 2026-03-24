/**
 * ORG-2A: Case messaging — matrix + product rules (program_manager send blocked; auditor blocked).
 */

import { AppError } from "@/lib/server/api";
import type { AuthContext } from "@/lib/server/auth";
import { logOrgPermissionDenied } from "@/lib/server/auth/orgCaseAccess";
import { getOrgPermissionScope } from "@/lib/server/auth/orgMatrix";
import type { CaseRowLike } from "@/lib/server/auth/orgCaseAccess";

export async function assertCaseMessagingAllowed(params: {
  ctx: AuthContext;
  caseRow: CaseRowLike;
  mode: "view" | "create";
  req?: Request | null;
}): Promise<void> {
  const { ctx, caseRow, mode, req } = params;

  if (ctx.orgRole === "auditor") {
    await logOrgPermissionDenied({
      ctx,
      req,
      resource: "messages",
      action: mode === "view" ? "view" : "create",
      metadata: { reason: "auditor_messaging_blocked", caseId: caseRow.id },
    });
    throw new AppError("FORBIDDEN", "Messaging is not available for your role", undefined, 403);
  }

  if (mode === "create" && ctx.orgRole === "program_manager") {
    await logOrgPermissionDenied({
      ctx,
      req,
      resource: "messages",
      action: "create",
      metadata: { reason: "program_manager_view_only", caseId: caseRow.id },
    });
    throw new AppError("FORBIDDEN", "Program managers can view messages but cannot send", undefined, 403);
  }

  if (!ctx.orgRole) {
    return;
  }

  const action = mode === "view" ? "view" : "create";
  const scope = await getOrgPermissionScope(ctx.orgRole, "messages", action);
  if (scope === null || scope === "none") {
    await logOrgPermissionDenied({
      ctx,
      req,
      resource: "messages",
      action,
      metadata: { reason: "matrix_denied", orgRole: ctx.orgRole, caseId: caseRow.id },
    });
    throw new AppError("FORBIDDEN", "Messaging is not available for your role", undefined, 403);
  }
}
