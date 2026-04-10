// @deprecated — inline access checks are being replaced by evalApplicantProfile in the policy
// engine. Functions are preserved for back-compat. Do not add new callers.

/**
 * Who may read a victim's account-level personal_info (profiles.personal_info).
 */

import type { AuthContext } from "@/lib/server/auth";
import { listCasesForOrganization, listCasesForUser } from "@/lib/server/data";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function advocateHasClientAccess(
  ctx: AuthContext,
  victimUserId: string
): Promise<boolean> {
  if (ctx.role !== "advocate") return false;
  const cases = await listCasesForUser({
    ctx,
    filters: { clientId: victimUserId.trim(), role: "advocate" },
  });
  return cases.length > 0;
}

/**
 * True if this victim would appear in GET /api/advocate/clients (shared cases as advocate,
 * or accepted connection without a case yet).
 */
export async function advocateHasClientRelationship(
  ctx: AuthContext,
  victimUserId: string
): Promise<boolean> {
  if (ctx.role !== "advocate") return false;
  const trimmed = victimUserId.trim();
  const cases = await listCasesForUser({
    ctx,
    filters: { clientId: trimmed, role: "advocate" },
  });
  if (cases.length > 0) return true;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("advocate_connection_requests")
    .select("id")
    .eq("victim_user_id", trimmed)
    .eq("advocate_user_id", ctx.userId)
    .eq("status", "accepted")
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function orgHasVictimCase(
  ctx: AuthContext,
  victimUserId: string
): Promise<boolean> {
  if (!ctx.orgId) return false;
  const cases = await listCasesForOrganization({ organizationId: ctx.orgId });
  return cases.some(
    (c) => String((c as { owner_user_id?: string }).owner_user_id ?? "") === victimUserId.trim()
  );
}

export function canReadVictimPersonalInfo(ctx: AuthContext, victimUserId: string): boolean {
  if (ctx.isAdmin) return true;
  if (ctx.userId === victimUserId) return true;
  return false;
}
