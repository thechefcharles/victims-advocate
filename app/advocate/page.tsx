"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConsentRedirect } from "@/components/auth/useConsentRedirect";
import { useI18n } from "@/components/i18n/i18nProvider";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdvocateClientsList } from "@/components/dashboard/AdvocateClientsList";
import { AdvocateProfileCompletionBanner } from "@/components/dashboard/AdvocateProfileCompletionBanner";
import { advocateWelcomeDisplayName } from "@/lib/personalInfo";

/** Advocate home at `/advocate` — client list → client cases → case (view/edit in intake). */
export default function AdvocateDashboardPage() {
  const { accessToken, orgId, organizationName, user, advocatePersonalInfo } = useAuth();
  const showOrgLink = Boolean(orgId);
  const consentReady = useConsentRedirect(accessToken, "/advocate");
  const { t, tf } = useI18n();

  const welcomeName = advocateWelcomeDisplayName(advocatePersonalInfo);
  const dashboardTitle = welcomeName
    ? tf("advocateDashboard.welcomeTitle", { name: welcomeName })
    : t("advocateDashboard.titleFallback");

  const organizationMeta =
    orgId != null ? (
      <p className="text-xs text-slate-400 leading-relaxed">
        {tf("advocateDashboard.organizationMeta", {
          name: organizationName?.trim() || "—",
        })}
      </p>
    ) : (
      <p className="text-xs text-slate-400 leading-relaxed">
        {t("advocateDashboard.noOrganizationMeta")}{" "}
        <Link
          href={ROUTES.advocateFindOrganizations}
          className="text-teal-400 hover:text-teal-300 font-medium underline-offset-2 hover:underline"
        >
          {t("advocateDashboard.connectOrganizationLink")}
        </Link>
      </p>
    );

  if (!consentReady) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto text-sm text-slate-400">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <PageHeader
          contextLine="Advocate"
          eyebrow="My workspace"
          title={dashboardTitle}
          subtitle="Open a client to see their cases. Open a case to view the application (read-only unless you have edit access)."
          meta={organizationMeta}
          rightActions={
            showOrgLink ? (
              <Link
                href={ROUTES.advocateOrg}
                className="text-sm font-medium text-slate-300 hover:text-white border border-slate-600 rounded-lg px-3 py-2"
              >
                {t("nav.organization")}
              </Link>
            ) : undefined
          }
        />

        <AdvocateProfileCompletionBanner />

        <section id="advocate-clients" className="scroll-mt-8">
          <AdvocateClientsList email={user?.email ?? null} token={accessToken} hideSignedInLine />
        </section>
      </div>
    </main>
  );
}
