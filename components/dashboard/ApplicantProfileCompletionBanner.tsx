"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import {
  victimHasDisplayName,
  victimProfileCompleteEnough,
} from "@/lib/personalInfo";

export function ApplicantProfileCompletionBanner() {
  const { loading, role, realRole, personalInfo, user } = useAuth();
  const { t } = useI18n();

  const metaRaw = user?.user_metadata?.role;
  const metaVictim =
    typeof metaRaw === "string" && metaRaw.toLowerCase() === "victim";
  const isApplicant =
    role === "victim" || realRole === "victim" || metaVictim;
  if (loading || !isApplicant) return null;
  if (victimProfileCompleteEnough(personalInfo)) return null;

  const body = victimHasDisplayName(personalInfo)
    ? t("applicantDashboard.profileBannerBody")
    : t("applicantDashboard.profileBannerBodyNoName");

  return (
    <div
      role="status"
      className="rounded-2xl border border-[var(--color-warning)]/35 bg-gradient-to-r from-[var(--color-gold-light)] to-[var(--color-warm-cream)] px-4 py-3 sm:px-5 sm:py-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-x-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-[var(--color-warning)]">
            {t("applicantDashboard.profileBannerTitle")}
          </p>
          <p className="text-xs text-[var(--color-charcoal)] leading-relaxed">{body}</p>
        </div>
        <div className="shrink-0">
          <Link
            href="/account"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--color-warning)] px-3.5 py-2 text-xs font-semibold text-white hover:brightness-105 transition"
          >
            {t("applicantDashboard.profileBannerCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
