"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import {
  victimHasDisplayName,
  victimProfileCompleteEnough,
} from "@/lib/personalInfo";

const SESSION_DISMISS_KEY = "victim_profile_banner_dismiss";

export function VictimProfileCompletionBanner() {
  const { loading, role, realRole, personalInfo, user } = useAuth();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(SESSION_DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const metaRaw = user?.user_metadata?.role;
  const metaVictim =
    typeof metaRaw === "string" && metaRaw.toLowerCase() === "victim";
  const isVictim =
    role === "victim" || realRole === "victim" || metaVictim;
  if (loading || !isVictim) return null;
  if (victimProfileCompleteEnough(personalInfo)) return null;
  if (dismissed) return null;

  const body = victimHasDisplayName(personalInfo)
    ? t("victimDashboard.profileBannerBody")
    : t("victimDashboard.profileBannerBodyNoName");

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-950/50 to-slate-900/80 px-4 py-3 sm:px-5 sm:py-4 shadow-sm shadow-amber-950/20"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-x-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-amber-100/95">
            {t("victimDashboard.profileBannerTitle")}
          </p>
          <p className="text-xs text-amber-100/75 leading-relaxed">{body}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/account"
            className="inline-flex items-center justify-center rounded-lg bg-amber-500/90 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition"
          >
            {t("victimDashboard.profileBannerCta")}
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg border border-slate-600/80 bg-slate-950/40 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-900/80"
          >
            {t("victimDashboard.profileBannerDismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
