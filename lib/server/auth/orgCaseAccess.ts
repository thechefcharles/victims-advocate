/**
 * @deprecated Phase 1 — permission matrix and evaluate* helpers removed from the live path.
 * Use `simpleAccess.ts` and `lib/auth/simpleOrgRole.ts` instead.
 * This file kept to avoid risky deletes of migration-era references; re-exports only.
 */
export { scopeToOrg, type CaseRowMinimal as CaseRowLike } from "./simpleAccess";
