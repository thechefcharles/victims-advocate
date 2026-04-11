// app/compensation/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import { ROUTES } from "@/lib/routes/pageRegistry";
import { PublicBottomCta } from "@/components/public/PublicBottomCta";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrimaryActionArea } from "@/components/layout/PrimaryActionArea";

export default function CompensationHubPage() {
  const { role, user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [showStatePrompt, setShowStatePrompt] = useState(false);

  const handleStartIntake = (state: "IL" | "IN") => {
    setShowStatePrompt(false);
    router.push(`/compensation/intake?state=${state}`);
  };

  const connectHref = !user
    ? "/signup"
    : role === "victim"
      ? ROUTES.applicantDashboard
      : "/help";

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {user && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-[var(--color-charcoal)]">
              You&apos;re signed in — <Link href={ROUTES.applicantDashboard} className="font-medium text-[var(--color-teal)] hover:underline">continue in your dashboard</Link>.
            </p>
          </div>
        )}
        <PageHeader
          contextLine={t("compensationHub.contextLine")}
          eyebrow={t("compensationHub.eyebrow")}
          title={t("compensationHub.title")}
          subtitle={t("compensationHub.subtitle")}
        />

        <PrimaryActionArea
          description={t("compensationHub.primaryHint")}
          primary={
            <button
              type="button"
              onClick={() => setShowStatePrompt(true)}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-teal)] transition"
            >
              {t("compensationHub.primaryCta")}
            </button>
          }
        />

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 text-sm">
          <Link
            href={connectHref}
            className="text-[var(--color-slate)] hover:text-white underline underline-offset-4"
          >
            {t("compensationHub.secondaryGetHelp")}
          </Link>
          <span className="hidden sm:inline text-[var(--color-slate)]" aria-hidden>
            ·
          </span>
          <Link
            href={role === "victim" ? ROUTES.applicantDashboard : ROUTES.compensationConnectAdvocate}
            className="text-[var(--color-slate)] hover:text-[var(--color-navy)] underline underline-offset-4"
          >
            {t("compensationHub.secondaryConnectAdvocate")}
          </Link>
        </div>

        <p className="text-center sm:text-left text-sm">
          <Link
            href={ROUTES.knowledgeCompensation}
            className="text-[var(--color-slate)] hover:text-white underline underline-offset-4"
          >
            {t("compensationHub.learnLink")}
          </Link>
        </p>

        {!user && (
          <p className="text-[11px] text-[var(--color-muted)]">{t("compensationHub.guestConnectHint")}</p>
        )}
        {user && role && role !== "victim" && (
          <p className="text-[11px] text-[var(--color-muted)]">{t("compensationHub.nonVictimRoleHint")}</p>
        )}

        <section>
          <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-3">{t("compensationHub.howItWorksTitle")}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-sm">
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">{t("compensationHub.step1Label")}</p>
              <p className="text-[var(--color-charcoal)] font-medium">{t("compensationHub.step1Title")}</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">{t("compensationHub.step1Body")}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-sm">
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">{t("compensationHub.step2Label")}</p>
              <p className="text-[var(--color-charcoal)] font-medium">{t("compensationHub.step2Title")}</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">{t("compensationHub.step2Body")}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-sm">
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">{t("compensationHub.step3Label")}</p>
              <p className="text-[var(--color-charcoal)] font-medium">{t("compensationHub.step3Title")}</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">{t("compensationHub.step3Body")}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[var(--color-navy)] mb-3">{t("compensationHub.mayNeedTitle")}</h2>
          <ul className="list-disc list-inside text-sm text-[var(--color-slate)] space-y-1.5 max-w-xl">
            <li>{t("compensationHub.mayNeedLi1")}</li>
            <li>{t("compensationHub.mayNeedLi2")}</li>
            <li>{t("compensationHub.mayNeedLi3")}</li>
          </ul>
          <p className="text-xs text-[var(--color-muted)] mt-3">{t("compensationHub.mayNeedFootnote")}</p>
        </section>

        <p className="text-xs text-[var(--color-muted)] leading-relaxed">{t("compensationHub.disclaimerShort")}</p>

        {(role === "advocate" || role === "organization") && (
          <p className="text-center text-xs text-[var(--color-muted)]">
            <Link href="/admin/cases" className="text-[var(--color-teal)] hover:text-[var(--color-teal-deep)] hover:underline">
              {t("compensationHub.openAdvocateDashboard")}
            </Link>
          </p>
        )}

        <PublicBottomCta />

        {showStatePrompt && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowStatePrompt(false)}
          >
            <div
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-white)] p-6 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-[var(--color-navy)]">{t("compensationHub.modalTitle")}</h3>
              <p className="text-sm text-[var(--color-slate)]">{t("compensationHub.modalBody")}</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleStartIntake("IL")}
                  className="w-full rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-navy)] hover:bg-[var(--color-light-sand)]/75 hover:border-[var(--color-teal)]/50 transition text-left"
                >
                  {t("applicantDashboard.stateIL")}
                </button>
                <button
                  type="button"
                  onClick={() => handleStartIntake("IN")}
                  className="w-full rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-navy)] hover:bg-[var(--color-light-sand)]/75 hover:border-[var(--color-teal)]/50 transition text-left"
                >
                  {t("applicantDashboard.stateIN")}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowStatePrompt(false)}
                className="w-full text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]"
              >
                {t("compensationHub.modalCancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
