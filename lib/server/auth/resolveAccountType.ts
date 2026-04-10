import type { AccountType } from "@/lib/registry";

/**
 * Maps legacy profile fields to the 2.0 AccountType.
 *
 * Mapping rules (evaluated in order):
 *   1. is_admin = true                       → "platform_admin"
 *   2. role === "victim"                     → "applicant"
 *   3. role === "advocate" | "organization"  → "provider"
 *   4. default                               → "applicant"
 *
 * Edge case — advocate with no active org membership:
 *   resolves to "provider" regardless. The caller's tenantId will be null.
 *   The policy engine treats provider + null tenantId as restricted access.
 *
 * Edge case — organization role with no active org membership:
 *   Same as advocate case above: resolves to "provider", tenantId null.
 *   This can occur during onboarding before org membership is created.
 */
export function resolveAccountType(profile: {
  role: string;
  is_admin: boolean;
}): AccountType {
  if (profile.is_admin) return "platform_admin";
  if (profile.role === "victim") return "applicant";
  if (profile.role === "advocate" || profile.role === "organization") return "provider";
  return "applicant";
}
