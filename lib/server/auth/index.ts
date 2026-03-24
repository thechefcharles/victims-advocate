export {
  getAuthContext,
  getOrgContext,
  type AuthContext,
  type ProfileRole,
  type AccountStatus,
} from "./context";
export type { SimpleOrgRole } from "@/lib/auth/simpleOrgRole";
export {
  SIMPLE_ORG_ROLES,
  SIMPLE_ORG_LEADERSHIP_ROLES,
  SIMPLE_ORG_MANAGEMENT_ROLES,
  SIMPLE_ORG_CASE_STAFF_ROLES,
  mapDbOrgRoleToSimple,
} from "@/lib/auth/simpleOrgRole";
export {
  ORG_MEMBERSHIP_ROLES,
  ORG_LEADERSHIP_ROLES,
  ORG_MANAGEMENT_ROLES,
  ORG_CASE_STAFF_ROLES,
  normalizeOrgRoleInput,
  isOrgLeadership,
  isOrgManagement,
  isOrgCaseStaff,
  type OrgRole,
} from "./orgRoles";
export {
  requireAuth,
  requireRole,
  requireOrg,
  requireOrgRole,
  requireVerifiedEmail,
  requireActiveAccount,
  requireFullAccess,
  type RequireOrgRoleOptions,
} from "./guards";
export {
  assertOwnOrOrgCaseAccess,
  hasOrgScope,
  isOwnCase,
  orgMemberCanAccessCase,
  orgMemberCanEditCase,
  logAccessDenied,
  scopeToOrg,
  type CaseRowMinimal,
} from "./simpleAccess";
