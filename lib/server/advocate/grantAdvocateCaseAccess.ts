/**
 * Grant an advocate case_access on a case (service role).
 * Used when an applicant adds an already-connected advocate to a case, or when a case-scoped connection is accepted.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";

export async function upsertAdvocateCaseAccess(params: {
  caseId: string;
  advocateUserId: string;
}): Promise<void> {
  const { caseId, advocateUserId } = params;
  const supabase = getSupabaseAdmin();

  const { data: caseRow, error: caseErr } = await supabase
    .from("cases")
    .select("id, organization_id")
    .eq("id", caseId)
    .maybeSingle();

  if (caseErr) {
    throw new AppError("INTERNAL", "Case lookup failed", undefined, 500);
  }
  if (!caseRow?.organization_id) {
    throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
  }

  const orgId = caseRow.organization_id as string;

  const { error: upsertErr } = await supabase.from("case_access").upsert(
    {
      case_id: caseId,
      user_id: advocateUserId,
      organization_id: orgId,
      role: "advocate",
      can_view: true,
      can_edit: false,
    },
    { onConflict: "case_id,user_id" }
  );

  if (upsertErr) {
    throw new AppError("INTERNAL", "Failed to grant advocate access to case", undefined, 500);
  }
}
