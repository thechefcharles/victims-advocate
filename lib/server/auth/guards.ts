/**
 * Phase 0/2: Authorization guards.
 * Throw AppError for standardized handling.
 * Phase 5: optional req for audit logging on access denial.
 */

import { AppError } from "@/lib/server/api";
import type { AuthContext, OrgRole, ProfileRole } from "./context";
import { logEvent } from "@/lib/server/audit/logEvent";

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

/** Phase 5: Block access until email is verified. */
export function requireVerifiedEmail(ctx: AuthContext, req?: Request | null): void {
  if (!ctx.emailVerified) {
    if (req) {
      logEvent({
        ctx,
        action: "auth.email_verification_required",
        metadata: { email: ctx.user.email ?? undefined },
        req,
      }).catch(() => {});
    }
    throw new AppError(
      "EMAIL_VERIFICATION_REQUIRED",
      "Please verify your email address to continue"
    );
  }
}

/** Phase 5: Block access for disabled or deleted accounts. */
export function requireActiveAccount(ctx: AuthContext, req?: Request | null): void {
  if (ctx.accountStatus === "deleted") {
    if (req) {
      logEvent({
        ctx,
        action: "auth.access_revoked",
        metadata: { reason: "account_deleted" },
        req,
      }).catch(() => {});
    }
    throw new AppError("ACCOUNT_DELETED", "This account has been deleted");
  }
  if (ctx.accountStatus === "disabled") {
    if (req) {
      logEvent({
        ctx,
        action: "auth.access_revoked",
        metadata: { reason: "account_disabled" },
        req,
      }).catch(() => {});
    }
    throw new AppError("ACCOUNT_DISABLED", "This account has been disabled");
  }
}

/** Phase 5: Require auth + verified email + active account (for full app access). */
export function requireFullAccess(
  ctx: AuthContext | null,
  req?: Request | null
): asserts ctx is AuthContext {
  requireAuth(ctx);
  requireActiveAccount(ctx, req);
  requireVerifiedEmail(ctx, req);
}
