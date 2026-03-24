export {
  getAuthContext,
  getOrgContext,
  type AuthContext,
  type ProfileRole,
  type OrgRole,
  type AccountStatus,
} from "./context";
export {
  ORG_MEMBERSHIP_ROLES,
  ORG_LEADERSHIP_ROLES,
  ORG_MANAGEMENT_ROLES,
  ORG_CASE_STAFF_ROLES,
  normalizeOrgRoleInput,
  isOrgLeadership,
  isOrgManagement,
  isOrgCaseStaff,
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
  canPerform,
  getOrgPermissionScope,
  PERMISSION_RESOURCES,
  type PermissionResource,
  type PermissionAction,
  type PermissionScope,
} from "./orgMatrix";
export {
  scopeToOrg,
  evaluateOrgMemberCaseAccess,
  evaluateOrgMemberDocumentAccess,
  logOrgPermissionDenied,
  fetchSuperviseeUserIds,
  isIntakeStageCaseStatus,
  type CaseRowLike,
} from "./orgCaseAccess";
