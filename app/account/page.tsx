"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import { getDashboardPath } from "@/lib/dashboardRoutes";
import { getPrivacyPolicyEmail } from "@/lib/legal/platformLegalConfig";
import { ProgramAffiliationForm } from "@/components/programs/ProgramAffiliationForm";
import { OrganizationCatalogForm } from "@/components/programs/OrganizationCatalogForm";
import { ApplicantPersonalInfoForm } from "@/components/account/ApplicantPersonalInfoForm";
import { AdvocatePersonalInfoForm } from "@/components/account/AdvocatePersonalInfoForm";
import { hasOrgBillingAuthoritySimpleRole } from "@/lib/billing/orgBillingReadiness";

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
    deletionRequested,
    deletionRequestedAt,
  } = useAuth();
  const { t } = useI18n();
  const privacyEmail = getPrivacyPolicyEmail();

  const deletionDateLabel = useMemo(() => {
    if (!deletionRequestedAt) return null;
    const d = new Date(deletionRequestedAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [deletionRequestedAt]);

  useEffect(() => {
    void refetchMe();
  }, [refetchMe]);

  const isApplicantProfile = useMemo(() => role === "victim", [role]);
  const isAdvocateProfile = useMemo(() => role === "advocate", [role]);

  const onPersonalInfoSaved = useCallback(async () => {
    await refetchMe();
  }, [refetchMe]);

  return (
    <RequireAuth>
      <main className="mx-auto max-w-2xl px-4 py-12 text-[var(--color-charcoal)] space-y-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">
          {t("nav.myAccount")}
        </p>
        <h1 className="text-2xl font-semibold text-[var(--color-navy)] mb-6">
          {t("nav.accountPlaceholderTitle")}
        </h1>

        {deletionRequested ? (
          <section
            className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/90 p-6 space-y-4"
            aria-live="polite"
          >
            <h2 className="text-lg font-semibold text-[var(--color-navy)]">Account deletion</h2>
            <p className="text-sm leading-relaxed text-[var(--color-charcoal)]">
              Deletion requested{deletionDateLabel ? ` — ${deletionDateLabel}` : ""}. Processing within 30
              days.
            </p>
            <p className="text-sm text-[var(--color-slate)]">
              We&apos;ve received your request and will take care of it. If you have questions, contact{" "}
              <a className="font-medium underline hover:text-[var(--color-navy)]" href={`mailto:${privacyEmail}`}>
                {privacyEmail}
              </a>
              .
            </p>
            <p className="text-sm text-[var(--color-slate)]">
              <Link href="/data-deletion" className="font-medium underline hover:text-[var(--color-navy)]">
                User Data Deletion Policy
              </Link>{" "}
              — what we delete and what may be retained.
            </p>
            <Link
              href={getDashboardPath({ isAdmin, orgId, orgRole, role })}
              className="inline-block text-sm text-teal-400 hover:text-teal-300"
            >
              {t("common.backToWorkspace")}
            </Link>
          </section>
        ) : null}

        {!deletionRequested ? (
          <>
        {/* Onboarding intent: org-leader signup path without membership yet */}
        {role === "organization" && !orgId && (
          <div className="rounded-2xl border border-amber-500/35 bg-amber-950/25 px-5 py-4 space-y-2">
            <p className="text-sm font-medium text-amber-100">Set Up Organization Access</p>
            <p className="text-xs text-amber-100/80 leading-relaxed">
              You don&apos;t belong to an organization workspace yet. Find your agency in the directory,
              request to join, or submit details if you&apos;re not listed.
            </p>
            <Link
              href="/organization/setup"
              className="inline-block text-sm font-semibold text-amber-300 hover:text-amber-200 underline-offset-2"
            >
              Open organization onboarding →
            </Link>
          </div>
        )}

        {isApplicantProfile && (
          <ApplicantPersonalInfoForm
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

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 p-6 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] mb-1">Email</p>
            <p className="text-sm text-[var(--color-charcoal)] break-all">{user?.email ?? "—"}</p>
          </div>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            {isApplicantProfile
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

        {orgId && hasOrgBillingAuthoritySimpleRole(orgRole) && (
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

        {orgId && !hasOrgBillingAuthoritySimpleRole(orgRole) && (
          <p className="text-xs text-[var(--color-muted)]">
            Only an organization owner can change which directory program this agency uses.
          </p>
        )}

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">Privacy &amp; data</h2>
          <p className="text-sm text-[var(--color-slate)] leading-relaxed">
            Learn how we delete data and what may be kept for legal reasons.
          </p>
          <Link
            href="/data-deletion"
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--color-teal-deep)] underline-offset-2 hover:underline"
          >
            User Data Deletion Policy
          </Link>
          <div className="pt-2 border-t border-[var(--color-border-light)]">
            <Link
              href="/account/delete"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-warm-cream)]"
            >
              Delete My Account
            </Link>
          </div>
        </section>
          </>
        ) : null}
      </main>
    </RequireAuth>
  );
}
