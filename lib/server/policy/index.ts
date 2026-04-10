/**
 * Domain 0.3 — Policy Engine public surface.
 *
 * Import everything from here:
 *   import { can, buildActor } from "@/lib/server/policy"
 *
 * Do NOT import directly from sub-files in new code.
 *
 * Note: lib/server/policies/ (plural) is the consent/terms system — a
 * completely different concern. Do not confuse with this module.
 */

export { can } from "./policyEngine";

export {
  buildActor,
  type PolicyActor,
  type PolicyResource,
  type PolicyResourceType,
  type PolicyContext,
  type PolicyDecision,
} from "./policyTypes";

export { POLICY_ACTIONS, type PolicyAction } from "./actionRegistry";

export { isSameTenant, assertSameTenant } from "./tenantScope";
