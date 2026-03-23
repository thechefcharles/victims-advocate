/**
 * Who may read a victim's account-level personal_info (profiles.personal_info).
 */

import type { AuthContext } from "@/lib/server/auth";
import { listCasesForOrganization, listCasesForUser } from "@/lib/server/data";

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
