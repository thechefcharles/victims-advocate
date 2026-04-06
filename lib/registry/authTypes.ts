/**
 * Auth and identity types — canonical registry for NxtStps 2.0.
 *
 * These are the TARGET architecture types. During migration, legacy types
 * (ProfileRole, SimpleOrgRole, AccountStatus) remain in their existing files
 * and import sites are not changed until each domain's migration pass.
 *
 * Legacy equivalents are documented per type via JSDoc.
 */

// ---------------------------------------------------------------------------
// AccountType
// ---------------------------------------------------------------------------

/**
 * Top-level account persona. Replaces the legacy `ProfileRole` union.
 *
 * Mapping from legacy:
 *   "applicant"     // replaces: ProfileRole === "victim"
 *   "provider"      // replaces: ProfileRole === "organization" (org workspace user)
 *   "agency"        // new in 2.0 — no legacy equivalent
 *   "platform_admin" // replaces: AuthContext.isAdmin === true
 *
 * Note: legacy `ProfileRole === "advocate"` was an individual advocate without
 * an org. In 2.0, standalone advocates become `"applicant"` helpers or are
 * onboarded into a provider org. Confirm routing with Notion spec.
 */
export type AccountType =
  | "applicant"    // replaces: ProfileRole === "victim"
  | "provider"     // replaces: ProfileRole === "organization"
  | "agency"       // new in 2.0 — no legacy equivalent
  | "platform_admin"; // replaces: isAdmin === true

// ---------------------------------------------------------------------------
// ProviderRole
// ---------------------------------------------------------------------------

/**
 * DB-level org membership roles. Mirrors the `org_membership_role` DB enum.
 * Replaces legacy `OrgRole` from `lib/server/auth/orgRoles.ts`.
 *
 * Product-facing display collapses these to Owner · Supervisor · Advocate
 * via `mapDbOrgRoleToSimple()` (legacy) or the 2.0 equivalent.
 *
 * All 6 DB enum values are included; do not add values without a migration.
 */
export type ProviderRole =
  | "org_owner"
  | "program_manager"
  | "supervisor"
  | "victim_advocate"
  | "intake_specialist"
  | "auditor";

// ---------------------------------------------------------------------------
// AgencyRole
// ---------------------------------------------------------------------------

/**
 * Role within an agency tenant. New in 2.0 — no legacy equivalent.
 * ⚠️  [INFERRED] Confirm values against Notion spec before execution pass.
 */
export type AgencyRole =
  | "agency_owner"
  | "program_officer"
  | "agency_reviewer";

// ---------------------------------------------------------------------------
// MembershipStatus
// ---------------------------------------------------------------------------

/**
 * Lifecycle state of an org or agency membership record.
 * Replaces legacy `org_memberships.status` text column (active/pending/etc.).
 *
 * Note: existing `org_memberships.status` DB column only enforces `active`
 * via application logic. A migration will add a CHECK constraint aligned to
 * these values. Do not write new rows with values outside this set.
 */
export type MembershipStatus =
  | "pending_invite"
  | "active"
  | "revoked"
  | "expired";

// ---------------------------------------------------------------------------
// UserAccountStatus
// ---------------------------------------------------------------------------

/**
 * Lifecycle state of a user account.
 * Extends legacy `AccountStatus` ("active" | "disabled" | "deleted") with
 * 2.0 target values. Existing `profiles.account_status` CHECK constraint
 * uses ("active" | "disabled" | "deleted") — a migration is required before
 * "pending_verification" and "suspended" can be written to the DB.
 *
 * Mapping from legacy AccountStatus:
 *   "pending_verification" // new — no legacy equivalent (was treated as active)
 *   "active"               // replaces: AccountStatus === "active"
 *   "suspended"            // replaces: AccountStatus === "disabled"
 *   "deactivated"          // replaces: AccountStatus === "deleted"
 */
export type UserAccountStatus =
  | "pending_verification"
  | "active"
  | "suspended"
  | "deactivated";

// ---------------------------------------------------------------------------
// SessionContext
// ---------------------------------------------------------------------------

/**
 * Server-side session snapshot for the 2.0 policy engine.
 * Replaces legacy `AuthContext` from `lib/server/auth/context.ts`.
 *
 * During migration: `AuthContext` remains in use across the codebase.
 * New domain service layers accept `SessionContext`; adapters convert
 * `AuthContext` → `SessionContext` at the boundary.
 *
 * Fields intentionally do NOT include raw DB role strings — all role
 * access goes through `activeRole` (typed) and the policy engine.
 */
export type SessionContext = {
  /** Supabase auth user ID. */
  userId: string;
  /** True if a valid session token was presented and verified. */
  authenticated: boolean;
  /** Top-level account persona. */
  accountType: AccountType;
  /**
   * Active role within the current tenant.
   * `ProviderRole` for provider tenants, `AgencyRole` for agency tenants,
   * null for applicant accounts or platform admins acting globally.
   */
  activeRole: ProviderRole | AgencyRole | null;
  /** Tenant type determines which role union applies to `activeRole`. */
  tenantType: "provider" | "agency" | "platform" | null;
  /** ID of the active tenant (org or agency). Null for applicant accounts. */
  tenantId: string | null;
  /** Whether the auth user's email has been confirmed. */
  emailVerified: boolean;
  /** Current lifecycle state of the user account. */
  accountStatus: UserAccountStatus;
  /**
   * When true, notification content is suppressed on all channels.
   * See Rule 18: every notification template must handle this.
   */
  safetyModeEnabled: boolean;
  /**
   * When true, the session is operating in a supervised/support context.
   * ⚠️  [INFERRED] Exact semantics — confirm against Notion spec.
   */
  supportMode: boolean;
};
