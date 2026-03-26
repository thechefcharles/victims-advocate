/**
 * Phase 5 — Organization billing readiness (scaffolding only).
 *
 * - **Customer entity:** `organizations` row (see `billing_plan_key`, `billing_status` migration).
 * - **Billing authority (future):** simple org role `owner` (DB `org_owner` / `program_manager` mapping).
 *   Do not conflate with `profiles.role`; membership is the source of truth for org power.
 * - **Now:** all features remain free — `isOrgFeatureBlockedByBilling` is always false until product enables gating.
 *
 * Keep billing logic out of signup, invites, join requests, and claim flows (Phase 4/5 boundary).
 */

import type { SimpleOrgRole } from "@/lib/auth/simpleOrgRole";

/** Default row values; match migration defaults. */
export const ORG_BILLING_PLAN_FREE = "free";
export const ORG_BILLING_STATUS_NOT_APPLICABLE = "not_applicable";

/** Future: true when org subscription is invalid / unpaid. Always false while product is free. */
export function isOrgFeatureBlockedByBilling(_org: {
  billing_plan_key?: string | null;
  billing_status?: string | null;
}): boolean {
  return false;
}

/** Future billing admin UX: user has simple owner-tier org membership (not profile `role`). */
export function hasOrgBillingAuthoritySimpleRole(orgRole: SimpleOrgRole | null | undefined): boolean {
  return orgRole === "owner";
}
