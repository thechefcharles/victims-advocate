import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFail, apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { getCaseById } from "@/lib/server/data";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;
    if (!id) {
      return apiFail("VALIDATION_ERROR", "Missing case id", undefined, 400);
    }

    const result = await getCaseById({ caseId: id, ctx });
    if (!result) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }

    const caseRow = result.case as { organization_id?: string | null };
    const supabaseAdmin = getSupabaseAdmin();

    let organization: { id: string; name: string } | null = null;
    const orgId = caseRow.organization_id;
    if (orgId) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("id, name")
        .eq("id", orgId)
        .maybeSingle();
      if (org?.id && org?.name) {
        organization = { id: org.id as string, name: org.name as string };
      }
    }

    const { data: accessRows, error: accErr } = await supabaseAdmin
      .from("case_access")
      .select("user_id")
      .eq("case_id", id)
      .eq("role", "advocate");

    if (accErr) {
      logger.error("support-team.case_access", { message: accErr.message });
    }

    const advocates: { id: string; label: string }[] = [];
    for (const row of accessRows ?? []) {
      const uid = row.user_id as string;
      try {
        const { data: udata, error: uerr } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (uerr || !udata?.user) {
          advocates.push({ id: uid, label: "Advocate" });
        } else {
          const email = udata.user.email ?? null;
          advocates.push({
            id: uid,
            label: email ?? `Advocate (${uid.slice(0, 8)}…)`,
          });
        }
      } catch {
        advocates.push({ id: uid, label: "Advocate" });
      }
    }

    return apiOk({ organization, advocates });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.support-team.get.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
