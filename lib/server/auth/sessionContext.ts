import type { SessionContext, UserAccountStatus } from "@/lib/registry";
import type { AuthContext, AccountStatus } from "./context";
import { resolveAccountType } from "./resolveAccountType";

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
 * activeRole is null in this adapter — ProviderRole mapping is deferred
 * to Domain 0.3 (Permissions / Policy Engine) where the full role-to-policy
 * mapping is implemented.
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
    activeRole: null, // deferred: Domain 0.3 maps SimpleOrgRole → ProviderRole
    tenantType,
    tenantId: ctx.orgId,
    emailVerified: ctx.emailVerified,
    accountStatus,
    safetyModeEnabled: ctx.safetyModeEnabled,
    supportMode,
  };
}
