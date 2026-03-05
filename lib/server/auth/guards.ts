/**
 * Phase 0/2: Authorization guards.
 * Throw AppError for standardized handling.
 */

import { AppError } from "@/lib/server/api";
import type { AuthContext, OrgRole, ProfileRole } from "./context";

export function requireAuth(ctx: AuthContext | null): asserts ctx is AuthContext {
  if (!ctx) {
    throw new AppError("AUTH_REQUIRED", "Unauthorized (missing or invalid token)");
  }
}

export function requireRole(ctx: AuthContext, roles: ProfileRole | ProfileRole[]): void {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(ctx.role)) {
    throw new AppError("FORBIDDEN", "Forbidden");
  }
}

export function requireOrg(ctx: AuthContext): void {
  if (!ctx.orgId) {
    throw new AppError("FORBIDDEN", "Organization membership required");
  }
}

export function requireOrgRole(ctx: AuthContext, roles: OrgRole | OrgRole[]): void {
  if (!ctx.orgId) {
    throw new AppError("FORBIDDEN", "Organization membership required");
  }
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!ctx.orgRole || !allowed.includes(ctx.orgRole)) {
    throw new AppError("FORBIDDEN", "Insufficient organization role");
  }
}
