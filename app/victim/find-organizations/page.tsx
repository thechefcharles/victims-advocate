"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES, victimCasePaths } from "@/lib/routes/pageRegistry";
import { APP_CARD, APP_PAGE_MAIN } from "@/lib/ui/appSurface";
import { useI18n } from "@/components/i18n/i18nProvider";

function VictimFindOrganizationsContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("case")?.trim() ?? "";

  const backHref = caseId ? victimCasePaths.organization(caseId) : ROUTES.victimDashboard;
  const backLabel = caseId
    ? t("victimDashboard.caseOrgManage.back")
    : t("victimDashboard.findOrganizationsPage.back");

  return (
    <main className={APP_PAGE_MAIN}>
      <div className="relative max-w-2xl mx-auto space-y-6">
        <PageHeader
          title={t("victimDashboard.findOrganizationsPage.title")}
          subtitle={
            caseId ? (
              <>
                {t("victimDashboard.findOrganizationsPage.body")}{" "}
                <span className="block mt-2 text-slate-400">
                  {t("victimDashboard.caseOrgManage.intro")}
                </span>
              </>
            ) : (
              t("victimDashboard.findOrganizationsPage.body")
            )
          }
          backLink={{
            href: backHref,
            label: backLabel,
          }}
          className={APP_CARD}
        />
        {caseId ? (
          <div className={`${APP_CARD} text-sm text-slate-400`}>
            <p>
              {t("victimDashboard.caseOrgManage.changeOrganization")} —{" "}
              <Link
                href={victimCasePaths.organization(caseId)}
                className="text-emerald-400 hover:text-emerald-300 underline"
              >
                {t("victimDashboard.caseOrgManage.title")}
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function VictimFindOrganizationsPage() {
  return (
    <Suspense
      fallback={
        <main className={APP_PAGE_MAIN}>
          <div className="max-w-2xl mx-auto text-slate-400 text-sm">Loading…</div>
        </main>
      }
    >
      <VictimFindOrganizationsContent />
    </Suspense>
  );
}
