"use client";

import { useSearchParams } from "next/navigation";
import { getLegalSupportEmail } from "@/lib/legal/platformLegalConfig";

/**
 * Shown when the user returns from the signup consent flow without accepting Terms.
 */
export function TermsDeclinedBanner() {
  const sp = useSearchParams();
  if (sp.get("terms_declined") !== "1") return null;

  const emailRaw = sp.get("support")?.trim();
  const email = emailRaw && emailRaw.includes("@") ? emailRaw : getLegalSupportEmail();

  return (
    <div
      role="status"
      className="border-b border-[var(--color-border-light)] bg-[var(--color-warm-cream)] px-4 py-3 text-center text-sm text-[var(--color-charcoal)] sm:px-6"
    >
      You must accept the Terms of Use to access NxtStps. If you have questions, contact us at{" "}
      <a className="font-medium underline hover:text-[var(--color-navy)]" href={`mailto:${email}`}>
        {email}
      </a>
      .
    </div>
  );
}
