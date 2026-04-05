/**
 * Platform legal / consent configuration. Prefer env for deployment-specific values.
 */

export type PlatformStatus = "pilot" | "mvp" | "production";

function parsePlatformStatus(raw: string | undefined): PlatformStatus {
  const v = (raw ?? "pilot").trim().toLowerCase();
  if (v === "production" || v === "mvp" || v === "pilot") return v;
  return "pilot";
}

/** Server and client: use NEXT_PUBLIC_ for client bundles. */
export function getPlatformStatus(): PlatformStatus {
  return parsePlatformStatus(process.env.NEXT_PUBLIC_PLATFORM_STATUS ?? process.env.PLATFORM_STATUS);
}

export const CURRENT_TERMS_VERSION = "2.0";

export const CURRENT_PRIVACY_POLICY_VERSION =
  process.env.NEXT_PUBLIC_CURRENT_PRIVACY_VERSION?.trim() || "2025-01";

export const CURRENT_LIABILITY_WAIVER_VERSION =
  process.env.NEXT_PUBLIC_CURRENT_WAIVER_VERSION?.trim() || "2025-01";

export const CURRENT_BETA_PLATFORM_ACK_VERSION =
  process.env.NEXT_PUBLIC_CURRENT_BETA_ACK_VERSION?.trim() || "1.0";

export const TERMS_CHANGE_SUMMARY =
  process.env.NEXT_PUBLIC_TERMS_CHANGE_SUMMARY?.trim() ||
  "Expanded to cover Provider users, added prohibited uses, content ownership, termination provisions, and communications consent.";

export function getLegalSupportEmail(): string {
  return (
    process.env.NEXT_PUBLIC_LEGAL_SUPPORT_EMAIL?.trim() ||
    process.env.LEGAL_SUPPORT_EMAIL?.trim() ||
    "legal@nxtstps.org"
  );
}

/** Total steps shown in the consent progress UI (beta hidden in production). */
export function getConsentProgressStepCount(): number {
  return getPlatformStatus() === "production" ? 3 : 4;
}

export type ConsentFlowStepMeta = {
  /** 1-based index in the visible progress bar */
  stepNumber: number;
  id: "terms" | "privacy" | "waiver" | "beta";
  label: string;
  path: string;
};

export function getConsentFlowSteps(): ConsentFlowStepMeta[] {
  const status = getPlatformStatus();
  const steps: ConsentFlowStepMeta[] = [
    { stepNumber: 1, id: "terms", label: "Terms of Use", path: "/signup/consent/terms" },
    { stepNumber: 2, id: "privacy", label: "Privacy Policy", path: "/signup/consent/privacy" },
    { stepNumber: 3, id: "waiver", label: "Liability Waiver", path: "/signup/consent/waiver" },
  ];
  if (status !== "production") {
    steps.push({
      stepNumber: 4,
      id: "beta",
      label: "Beta Acknowledgment",
      path: "/signup/consent/beta",
    });
  }
  return steps;
}
