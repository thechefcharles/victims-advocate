"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import { getDashboardPath } from "@/lib/dashboardRoutes";
import { ProgramAffiliationForm } from "@/components/programs/ProgramAffiliationForm";
import { OrganizationCatalogForm } from "@/components/programs/OrganizationCatalogForm";
import { VictimPersonalInfoForm } from "@/components/account/VictimPersonalInfoForm";
import { AdvocatePersonalInfoForm } from "@/components/account/AdvocatePersonalInfoForm";

export default function AccountPage() {
  const {
    user,
    isAdmin,
    role,
    orgId,
    orgRole,
    accessToken,
    affiliatedCatalogEntryId,
    organizationCatalogEntryId,
    personalInfo,
    advocatePersonalInfo,
    organizationName,
    refetchMe,
  } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    void refetchMe();
  }, [refetchMe]);

  const isVictimProfile = useMemo(() => role === "victim", [role]);
  const isAdvocateProfile = useMemo(() => role === "advocate", [role]);

  const onPersonalInfoSaved = useCallback(async () => {
    await refetchMe();
  }, [refetchMe]);

  return (
    <RequireAuth>
      <main className="mx-auto max-w-2xl px-4 py-12 text-slate-200 space-y-8">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">
          {t("nav.myAccount")}
        </p>
        <h1 className="text-2xl font-semibold text-slate-50 mb-6">
          {t("nav.accountPlaceholderTitle")}
        </h1>

        {isVictimProfile && (
          <VictimPersonalInfoForm
            accessToken={accessToken}
            initial={personalInfo}
            onSaved={() => {
              void onPersonalInfoSaved();
            }}
          />
        )}

        {isAdvocateProfile && (
          <AdvocatePersonalInfoForm
            accessToken={accessToken}
            initial={advocatePersonalInfo}
            organizationName={organizationName}
            onSaved={() => {
              void onPersonalInfoSaved();
            }}
          />
        )}

        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Email</p>
            <p className="text-sm text-slate-200 break-all">{user?.email ?? "—"}</p>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            {isVictimProfile
              ? t("nav.accountVictimEmailCardBody")
              : isAdvocateProfile
                ? t("nav.accountAdvocateEmailCardBody")
                : t("nav.accountPlaceholderBody")}
          </p>
          <Link
            href={getDashboardPath({ isAdmin, orgId, orgRole, role })}
            className="inline-block text-sm text-teal-400 hover:text-teal-300"
          >
            {t("common.backToWorkspace")}
          </Link>
        </div>

        {role === "organization" && orgRole === "org_admin" && orgId && (
          <OrganizationCatalogForm
            accessToken={accessToken}
            initialCatalogId={organizationCatalogEntryId}
            onSaved={() => {
              void refetchMe();
            }}
          />
        )}

        {role !== "organization" && (
          <ProgramAffiliationForm
            accessToken={accessToken}
            initialCatalogId={affiliatedCatalogEntryId}
            onSaved={() => {
              void refetchMe();
            }}
          />
        )}

        {role === "organization" && orgRole !== "org_admin" && (
          <p className="text-xs text-slate-500">
            Only an organization admin can change which directory program this agency uses.
          </p>
        )}
      </main>
    </RequireAuth>
  );
}
