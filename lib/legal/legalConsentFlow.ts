import {
  CURRENT_BETA_PLATFORM_ACK_VERSION,
  CURRENT_LIABILITY_WAIVER_VERSION,
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  getPlatformStatus,
  type PlatformStatus,
} from "@/lib/legal/platformLegalConfig";

/** Profile legal columns as returned from DB (snake_case). */
export type ProfileLegalConsentFields = {
  terms_accepted_at: string | null;
  terms_version: string | null;
  privacy_policy_accepted_at: string | null;
  privacy_policy_version: string | null;
  liability_waiver_accepted_at: string | null;
  liability_waiver_version: string | null;
  beta_platform_ack_at: string | null;
  beta_platform_ack_version: string | null;
};

export function getLegalConsentNextPath(
  p: ProfileLegalConsentFields,
  platformStatus?: PlatformStatus
): string | null {
  const status = platformStatus ?? getPlatformStatus();

  if (!p.terms_accepted_at || p.terms_version !== CURRENT_TERMS_VERSION) {
    return "/signup/consent/terms";
  }
  if (!p.privacy_policy_accepted_at || p.privacy_policy_version !== CURRENT_PRIVACY_POLICY_VERSION) {
    return "/signup/consent/privacy";
  }
  if (!p.liability_waiver_accepted_at || p.liability_waiver_version !== CURRENT_LIABILITY_WAIVER_VERSION) {
    return "/signup/consent/waiver";
  }
  if (status !== "production") {
    if (
      !p.beta_platform_ack_at ||
      p.beta_platform_ack_version !== CURRENT_BETA_PLATFORM_ACK_VERSION
    ) {
      return "/signup/consent/beta";
    }
  }
  return null;
}
