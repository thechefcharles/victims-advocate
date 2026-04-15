import type { SessionContext, UserAccountStatus, ProviderRole } from "@nxtstps/registry";
import type { AuthContext, AccountStatus } from "./context";
import { resolveAccountType } from "./resolveAccountType";

/** Domain 0.3: SimpleOrgRole → ProviderRole mapping (Decision 6). */
const orgRoleMap: Record<string, ProviderRole> = {
  owner: "org_owner",
  supervisor: "supervisor",
  advocate: "victim_advocate",
};

function mapAccountStatus(legacy: AccountStatus): UserAccountStatus {
  if (legacy === "active") return "active";
  if (legacy === "disabled") return "suspended";
  if (legacy === "deleted") return "deactivated";
  return "active";
}

/**
 * Adapts the legacy AuthContext to the 2.0 SessionContext shape.
 *
 * During migration: AuthContext remains in use throughout the codebase.
 * New domain service layers accept SessionContext; this adapter converts
 * at the boundary so both can coexist.
 *
 * activeRole: maps legacy SimpleOrgRole → ProviderRole via orgRoleMap
 * (Domain 0.3). "owner"→"org_owner", "supervisor"→"supervisor",
 * "advocate"→"victim_advocate". AgencyRole support deferred to agency domain.
 */
export function buildSessionContext(ctx: AuthContext): SessionContext {
  const accountType = resolveAccountType({ role: ctx.role, is_admin: ctx.isAdmin });
  const accountStatus = mapAccountStatus(ctx.accountStatus);
  const supportMode = ctx.isAdmin && ctx.realRole !== ctx.role;
  const tenantType = ctx.isAdmin ? "platform" : ctx.orgId ? "provider" : null;

  return {
    userId: ctx.userId,
    authenticated: true,
    accountType,
    activeRole: ctx.orgRole ? (orgRoleMap[ctx.orgRole] ?? null) : null,
    tenantType,
    tenantId: ctx.orgId,
    emailVerified: ctx.emailVerified,
    accountStatus,
    safetyModeEnabled: ctx.safetyModeEnabled,
    supportMode,
  };
}
