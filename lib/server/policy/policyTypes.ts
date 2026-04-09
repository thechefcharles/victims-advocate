/**
 * Domain 0.3 — Policy Engine core types.
 *
 * PolicyActor  — who is acting (derived from AuthContext at route boundary)
 * PolicyResource — what they are acting on
 * PolicyContext  — optional ambient context (consent, feature flags, metadata)
 * PolicyDecision — the engine's verdict
 *
 * buildActor() is the canonical adapter from AuthContext → PolicyActor.
 * Call it once per request at the route boundary before passing to can().
 */

import type {
  AccountType,
  ProviderRole,
  AgencyRole,
  PolicyDecisionReasonCode,
} from "@/lib/registry";
import type { AuthContext } from "@/lib/server/auth/context";

// ---------------------------------------------------------------------------
// PolicyActor
// ---------------------------------------------------------------------------

/**
 * Immutable snapshot of who is making the request.
 * Derived from AuthContext via buildActor(). Never constructed directly in routes.
 */
export type PolicyActor = {
  userId: string;
  accountType: AccountType;
  /** Typed org/agency role within the active tenant. Null for applicants and platform admins acting globally. */
  activeRole: ProviderRole | AgencyRole | null;
  /** ID of the active tenant (org or agency). Null for applicant accounts. */
  tenantId: string | null;
  tenantType: "provider" | "agency" | "platform" | null;
  isAdmin: boolean;
  /** True when an admin is operating in view-as mode (acting as another persona). */
  supportMode: boolean;
  /** When true, notification content must be suppressed. Propagated into audit metadata. */
  safetyModeEnabled: boolean;
};

// ---------------------------------------------------------------------------
// PolicyResource
// ---------------------------------------------------------------------------

/**
 * Union of all resource type strings the policy engine recognizes.
 * Must stay in sync with the resource.type dispatch in policyEngine.ts.
 */
export type PolicyResourceType =
  | "case"
  | "document"
  | "message"
  | "message_thread"
  | "org"
  | "support_request"
  | "consent"
  | "intake_session"
  | "intake_submission"
  | "state_workflow_config"
  | "cvc_form_template"
  | "output_generation_job"
  | "translation_mapping_set"
  | "locale_preference"
  | "explanation_request"
  | "admin"
  | "applicant_profile"
  | "applicant_preference"
  | "safety_preference"
  | "trusted_helper_access"
  | "applicant_bookmark"
  | "referral"
  | "appointment"
  | "event"
  | "provider_search"
  | "trusted_helper"
  | "recommendation";

/**
 * The resource being acted upon. Callers populate only the fields relevant
 * to the action — unused fields are left undefined.
 *
 * tenantId: the org/agency that owns the resource (for cross-tenant checks).
 * ownerId:  the user who created / owns the resource (for ownership checks).
 * assignedTo: the advocate assigned to the case/document (for assignment checks).
 * status:   current state-machine status (for state checks).
 */
export type PolicyResource = {
  type: PolicyResourceType;
  id: string | null;
  ownerId?: string | null;
  tenantId?: string | null;
  status?: string | null;
  assignedTo?: string | null;
};

// ---------------------------------------------------------------------------
// PolicyContext
// ---------------------------------------------------------------------------

/**
 * Optional ambient context injected by the caller.
 * The engine never queries the DB internally — all DB-derived state
 * must be pre-fetched and passed here (Decision 4, Decision 7).
 *
 * consentStatus: pre-fetched from policy_acceptances; "missing" triggers MISSING_CONSENT.
 * featureFlags:  pre-fetched feature flags; absent key = feature enabled.
 * requestMetadata: arbitrary request-scoped metadata for audit enrichment.
 */
export type PolicyContext = {
  consentStatus?: "accepted" | "missing" | null;
  featureFlags?: Record<string, boolean>;
  requestMetadata?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// PolicyDecision
// ---------------------------------------------------------------------------

/**
 * The verdict returned by can(). Always inspect `allowed` first.
 *
 * auditRequired: true on all admin ALLOWs and all DENYs. The engine
 * fires a fire-and-forget logEvent on denials; callers must handle
 * the audit trail for auditRequired=true ALLOWs (admin actions).
 */
export type PolicyDecision = {
  allowed: boolean;
  reason: PolicyDecisionReasonCode;
  message?: string;
  auditRequired: boolean;
};

// ---------------------------------------------------------------------------
// buildActor — AuthContext → PolicyActor adapter
// ---------------------------------------------------------------------------

/** SimpleOrgRole → ProviderRole mapping (Decision 6, Domain 0.3). */
const orgRoleMap: Record<string, ProviderRole> = {
  owner: "org_owner",
  supervisor: "supervisor",
  advocate: "victim_advocate",
};

/**
 * Converts the legacy AuthContext into a typed PolicyActor for the engine.
 * Call once at the route boundary after getAuthContext() succeeds.
 *
 * isAdmin takes precedence over orgId for tenantType — platform admins are
 * always "platform" actors regardless of any org membership they may hold.
 */
export function buildActor(ctx: AuthContext): PolicyActor {
  return {
    userId: ctx.userId,
    accountType: ctx.accountType,
    activeRole: ctx.orgRole ? (orgRoleMap[ctx.orgRole] ?? null) : null,
    tenantId: ctx.orgId,
    tenantType: ctx.isAdmin ? "platform" : ctx.orgId ? "provider" : null,
    isAdmin: ctx.isAdmin,
    supportMode: ctx.isAdmin && ctx.realRole !== ctx.role,
    safetyModeEnabled: ctx.safetyModeEnabled,
  };
}
