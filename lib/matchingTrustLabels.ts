/** Client-safe: public wording for designation on match cards (not rankings). */

export function designationTierTrustLabel(tier: string | null | undefined): string | null {
  if (!tier || tier === "insufficient_data") return null;
  switch (tier) {
    case "comprehensive":
      return "Structured readiness";
    case "established":
      return "Established profile";
    case "foundational":
      return "Building platform presence";
    default:
      return null;
  }
}
