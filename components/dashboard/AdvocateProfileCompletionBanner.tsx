"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import { advocateHasDisplayName, advocateProfileCompleteEnough } from "@/lib/personalInfo";
import { ROUTES } from "@/lib/routes/pageRegistry";

export function AdvocateProfileCompletionBanner() {
  const { loading, role, realRole, advocatePersonalInfo, orgId, user } = useAuth();
  const { t } = useI18n();

  const metaRaw = user?.user_metadata?.role;
  const metaAdvocate =
    typeof metaRaw === "string" && metaRaw.toLowerCase() === "advocate";
  const isAdvocate =
    role === "advocate" || realRole === "advocate" || metaAdvocate;
  if (loading || !isAdvocate) return null;
  if (advocateProfileCompleteEnough(advocatePersonalInfo, orgId)) return null;

  const body = advocateHasDisplayName(advocatePersonalInfo)
    ? t("advocateDashboard.profileBannerBody")
    : t("advocateDashboard.profileBannerBodyNoName");

  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-950/50 to-slate-900/80 px-4 py-3 sm:px-5 sm:py-4 shadow-sm shadow-amber-950/20"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-x-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-amber-100/95">
            {t("advocateDashboard.profileBannerTitle")}
          </p>
          <p className="text-xs text-amber-100/75 leading-relaxed">{body}</p>
        </div>
        <div className="shrink-0">
          <Link
            href={ROUTES.account}
            className="inline-flex items-center justify-center rounded-lg bg-amber-500/90 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition"
          >
            {t("advocateDashboard.profileBannerCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
