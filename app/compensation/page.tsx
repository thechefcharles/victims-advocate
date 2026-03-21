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
      ? ROUTES.compensationConnectAdvocate
      : "/help";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-8">
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
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition"
            >
              {t("compensationHub.primaryCta")}
            </button>
          }
        />

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 text-sm">
          <Link
            href={connectHref}
            className="text-slate-300 hover:text-white underline underline-offset-4"
          >
            {t("compensationHub.secondaryGetHelp")}
          </Link>
          <span className="hidden sm:inline text-slate-600" aria-hidden>
            ·
          </span>
          <Link
            href={ROUTES.compensationConnectAdvocate}
            className="text-slate-300 hover:text-slate-100 underline underline-offset-4"
          >
            {t("compensationHub.secondaryConnectAdvocate")}
          </Link>
        </div>

        <p className="text-center sm:text-left text-sm">
          <Link
            href={ROUTES.knowledgeCompensation}
            className="text-slate-300 hover:text-white underline underline-offset-4"
          >
            {t("compensationHub.learnLink")}
          </Link>
        </p>

        {!user && (
          <p className="text-[11px] text-slate-500">{t("compensationHub.guestConnectHint")}</p>
        )}
        {user && role && role !== "victim" && (
          <p className="text-[11px] text-slate-500">{t("compensationHub.nonVictimRoleHint")}</p>
        )}

        <section>
          <h2 className="text-sm font-semibold text-slate-200 mb-3">{t("compensationHub.howItWorksTitle")}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
              <p className="text-xs font-semibold text-slate-400 mb-1">{t("compensationHub.step1Label")}</p>
              <p className="text-slate-200 font-medium">{t("compensationHub.step1Title")}</p>
              <p className="text-xs text-slate-400 mt-1">{t("compensationHub.step1Body")}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
              <p className="text-xs font-semibold text-slate-400 mb-1">{t("compensationHub.step2Label")}</p>
              <p className="text-slate-200 font-medium">{t("compensationHub.step2Title")}</p>
              <p className="text-xs text-slate-400 mt-1">{t("compensationHub.step2Body")}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
              <p className="text-xs font-semibold text-slate-400 mb-1">{t("compensationHub.step3Label")}</p>
              <p className="text-slate-200 font-medium">{t("compensationHub.step3Title")}</p>
              <p className="text-xs text-slate-400 mt-1">{t("compensationHub.step3Body")}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">{t("compensationHub.mayNeedTitle")}</h2>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 max-w-xl">
            <li>{t("compensationHub.mayNeedLi1")}</li>
            <li>{t("compensationHub.mayNeedLi2")}</li>
            <li>{t("compensationHub.mayNeedLi3")}</li>
          </ul>
          <p className="text-xs text-slate-500 mt-3">{t("compensationHub.mayNeedFootnote")}</p>
        </section>

        <p className="text-xs text-slate-500 leading-relaxed">{t("compensationHub.disclaimerShort")}</p>

        {(role === "advocate" || role === "organization") && (
          <p className="text-center text-xs text-slate-500">
            <Link href="/admin/cases" className="text-blue-400 hover:text-blue-300 hover:underline">
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
              className="rounded-2xl border border-slate-700 bg-slate-950 p-6 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-100">{t("compensationHub.modalTitle")}</h3>
              <p className="text-sm text-slate-300">{t("compensationHub.modalBody")}</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleStartIntake("IL")}
                  className="w-full rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-slate-100 hover:bg-slate-800/60 hover:border-blue-500/50 transition text-left"
                >
                  {t("victimDashboard.stateIL")}
                </button>
                <button
                  type="button"
                  onClick={() => handleStartIntake("IN")}
                  className="w-full rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-slate-100 hover:bg-slate-800/60 hover:border-blue-500/50 transition text-left"
                >
                  {t("victimDashboard.stateIN")}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowStatePrompt(false)}
                className="w-full text-sm text-slate-400 hover:text-slate-200"
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
