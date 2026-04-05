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
  process.env.NEXT_PUBLIC_CURRENT_PRIVACY_VERSION?.trim() || "2.0";

export const CURRENT_LIABILITY_WAIVER_VERSION =
  process.env.NEXT_PUBLIC_CURRENT_WAIVER_VERSION?.trim() || "1.0";

/** Pilot/MVP Step 4 — Beta Platform and Pilot Program Acknowledgment (profiles + audit). */
export const CURRENT_PILOT_ACK_VERSION =
  process.env.NEXT_PUBLIC_CURRENT_PILOT_ACK_VERSION?.trim() ||
  process.env.NEXT_PUBLIC_CURRENT_BETA_ACK_VERSION?.trim() ||
  "1.0";

/** @deprecated Use CURRENT_PILOT_ACK_VERSION */
export const CURRENT_BETA_PLATFORM_ACK_VERSION = CURRENT_PILOT_ACK_VERSION;

export const TERMS_CHANGE_SUMMARY =
  process.env.NEXT_PUBLIC_TERMS_CHANGE_SUMMARY?.trim() ||
  "Expanded to cover Provider users, added prohibited uses, content ownership, termination provisions, and communications consent.";

export const PRIVACY_CHANGE_SUMMARY =
  process.env.NEXT_PUBLIC_PRIVACY_CHANGE_SUMMARY?.trim() ||
  "Expanded to cover organizational and Applicant distinctions, added survivor safety provisions, cookies disclosure, breach notification procedure, data retention schedule, BIPA disclosure, GPC signal response, and withdrawal of consent.";

export const WAIVER_CHANGE_SUMMARY =
  process.env.NEXT_PUBLIC_WAIVER_CHANGE_SUMMARY?.trim() ||
  "Initial production version. Streamlined from draft. Added Provider user provisions, cross-reference table, crisis support resources, and trauma-informed framing block.";

export const PILOT_ACK_CHANGE_SUMMARY =
  process.env.NEXT_PUBLIC_PILOT_ACK_CHANGE_SUMMARY?.trim() ||
  "Initial pilot version. Covers MVP platform status, pilot program participation, platform change handling, data protection during development, and feedback reporting.";

export function getLegalSupportEmail(): string {
  return (
    process.env.NEXT_PUBLIC_LEGAL_SUPPORT_EMAIL?.trim() ||
    process.env.LEGAL_SUPPORT_EMAIL?.trim() ||
    "legal@nxtstps.org"
  );
}

/** Privacy rights / DPO-style contact (falls back to legal support). */
export function getPrivacyPolicyEmail(): string {
  return (
    process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() ||
    process.env.PRIVACY_EMAIL?.trim() ||
    getLegalSupportEmail()
  );
}

/** Printed Privacy / deletion policy contact block; override with NEXT_PUBLIC_PRIVACY_MAILING_ADDRESS. */
export function getPrivacyMailingAddress(): string {
  return (
    process.env.NEXT_PUBLIC_PRIVACY_MAILING_ADDRESS?.trim() ||
    "Correspondence address available upon request via the privacy email below."
  );
}

/** Help article for browser cookie settings (linked from Privacy Policy §6.7). */
export function getCookieManagementHelpUrl(): string {
  return (
    process.env.NEXT_PUBLIC_COOKIE_HELP_URL?.trim() ||
    "https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
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
