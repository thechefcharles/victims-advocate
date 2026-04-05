"use client";

import { useSearchParams } from "next/navigation";
import { getLegalSupportEmail, getPrivacyPolicyEmail } from "@/lib/legal/platformLegalConfig";

/**
 * Homepage notices when the user declines a signup consent step.
 */
export function ConsentDeclinedBanners() {
  const sp = useSearchParams();
  const termsDeclined = sp.get("terms_declined") === "1";
  const privacyDeclined = sp.get("privacy_declined") === "1";
  const waiverDeclined = sp.get("waiver_declined") === "1";
  const pilotAckDeclined = sp.get("pilot_ack_declined") === "1";

  if (!termsDeclined && !privacyDeclined && !waiverDeclined && !pilotAckDeclined) return null;

  const supportRaw = sp.get("support")?.trim();
  const termsEmail =
    termsDeclined && supportRaw && supportRaw.includes("@")
      ? supportRaw
      : getLegalSupportEmail();
  const privacyEmail = getPrivacyPolicyEmail();
  const waiverEmail = getLegalSupportEmail();
  const pilotAckEmail = getLegalSupportEmail();

  return (
    <div className="space-y-0">
      {termsDeclined ? (
        <div
          role="status"
          className="border-b border-[var(--color-border-light)] bg-[var(--color-warm-cream)] px-4 py-3 text-center text-sm text-[var(--color-charcoal)] sm:px-6"
        >
          You must accept the Terms of Use to access NxtStps. If you have questions, contact us at{" "}
          <a className="font-medium underline hover:text-[var(--color-navy)]" href={`mailto:${termsEmail}`}>
            {termsEmail}
          </a>
          .
        </div>
      ) : null}
      {privacyDeclined ? (
        <div
          role="status"
          className="border-b border-[var(--color-border-light)] bg-[var(--color-warm-cream)] px-4 py-3 text-center text-sm text-[var(--color-charcoal)] sm:px-6"
        >
          You must accept the Privacy Policy to access NxtStps. If you have questions, contact us at{" "}
          <a
            className="font-medium underline hover:text-[var(--color-navy)]"
            href={`mailto:${privacyEmail}`}
          >
            {privacyEmail}
          </a>
          .
        </div>
      ) : null}
      {waiverDeclined ? (
        <div
          role="status"
          className="border-b border-[var(--color-border-light)] bg-[var(--color-warm-cream)] px-4 py-3 text-center text-sm text-[var(--color-charcoal)] sm:px-6"
        >
          You must accept the Liability Waiver to access NxtStps. If you have questions, contact us at{" "}
          <a
            className="font-medium underline hover:text-[var(--color-navy)]"
            href={`mailto:${waiverEmail}`}
          >
            {waiverEmail}
          </a>
          .
        </div>
      ) : null}
      {pilotAckDeclined ? (
        <div
          role="status"
          className="border-b border-[var(--color-border-light)] bg-[var(--color-warm-cream)] px-4 py-3 text-center text-sm text-[var(--color-charcoal)] sm:px-6"
        >
          You must acknowledge the platform&apos;s pilot status to access NxtStps at this time. Contact us at{" "}
          <a
            className="font-medium underline hover:text-[var(--color-navy)]"
            href={`mailto:${pilotAckEmail}`}
          >
            {pilotAckEmail}
          </a>{" "}
          if you have questions.
        </div>
      ) : null}
    </div>
  );
}
