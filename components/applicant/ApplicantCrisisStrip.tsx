"use client";

import { useI18n } from "@/components/i18n/i18nProvider";

/**
 * Persistent support strip for applicant pathway — calm, not a warning (Phase 3).
 */
export function ApplicantCrisisStrip() {
  const { t } = useI18n();

  return (
    <aside
      className="applicant-crisis-strip pointer-events-none fixed inset-x-0 bottom-0 z-[35] border-t border-[var(--color-border-light)] bg-[var(--color-surface-2)] px-3 py-2 text-[var(--color-slate)] shadow-[var(--shadow-subtle)]"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label={t("intake.pathwaySafety.supportResourcesLabel")}
    >
      <div className="pointer-events-auto mx-auto max-w-4xl space-y-1 text-center sm:text-left sm:text-xs text-[11px] leading-snug">
        <p className="font-medium text-[var(--color-charcoal)]">
          {t("intake.pathwaySafety.supportResourcesLabel")}
        </p>
        <p className="text-[var(--color-slate)]">{t("intake.pathwaySafety.supportIntro")}</p>
        <ul className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-0.5">
          <li>
            <a href="tel:988" className="underline decoration-[var(--color-border)] underline-offset-2 hover:text-[var(--color-charcoal)]">
              {t("intake.pathwaySafety.crisis988")}
            </a>
          </li>
          <li>{t("intake.pathwaySafety.crisisText")}</li>
          <li>
            <a href="tel:911" className="underline decoration-[var(--color-border)] underline-offset-2 hover:text-[var(--color-charcoal)]">
              {t("intake.pathwaySafety.crisis911")}
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
}
