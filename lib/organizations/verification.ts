/**
 * Governance trust display helpers.
 *
 * This is a communication layer only (badge/copy). It does not change any
 * eligibility, ranking, or matching behavior.
 */

export function isNxtStpsVerified(org: {
  lifecycle_status?: string | null;
  public_profile_status?: string | null;
}): boolean {
  return (
    (org.lifecycle_status ?? "").trim() === "managed" &&
    (org.public_profile_status ?? "").trim() === "active"
  );
}

export function getNxtStpsVerifiedLabel(): string {
  return "NxtStps Verified";
}

export function getNxtStpsVerifiedDescription(): string {
  return "This organization has approved management and an active profile on NxtStps.";
}

