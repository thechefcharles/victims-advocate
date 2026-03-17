/**
 * Phase 4: Consent and disclosure framework.
 */

export type { PolicyDocType, PolicyAppliesToRole, PolicyDocumentRow, PolicyAcceptanceRow } from "./types";
export {
  getActivePolicyDocument,
  getRequiredPoliciesForUser,
  hasAcceptedActivePolicy,
  getMissingAcceptances,
} from "./lookup";
export type { GetActivePolicyParams, RequiredPolicySpec } from "./lookup";
export { requireAcceptedPolicies } from "./require";
export type { RequireAcceptedPoliciesParams } from "./require";
