"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";
import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { useI18n } from "@/components/i18n/i18nProvider";
import { ROUTES } from "@/lib/routes/pageRegistry";

type Step = 1 | 2 | 3;
type RoleChoice = "victim" | "family" | "unsure" | null;
type ReportChoice = "yes" | "no" | "unsure" | null;

const INTAKE_HREF = ROUTES.compensationIntake;

/**
 * Marketing-only interactive preview (no server persistence).
 * Brand Kit: error red reserved for real errors; stats and emphasis use warning / teal / sage / gold.
 */
export function MarketingHomeInteractiveDemo() {
  const { t } = useI18n();
  const headingId = useId();
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<RoleChoice>(null);
  const [report, setReport] = useState<ReportChoice>(null);

  const reset = useCallback(() => {
    setStep(1);
    setRole(null);
    setReport(null);
  }, []);

  const goStep2 = useCallback(() => setStep(2), []);
  const goStep3 = useCallback(() => setStep(3), []);

  return (
    <section
      id="interactive-demo"
      className="scroll-mt-28 border-b border-[var(--color-border-light)] bg-[var(--color-bg)] py-[var(--space-7)] sm:py-[var(--space-8)]"
      aria-labelledby={headingId}
    >
      <div className="mx-auto max-w-3xl px-[var(--space-4)] text-center sm:px-[var(--space-6)]">
        <span className="inline-block rounded-[var(--radius-pill)] bg-[var(--color-teal-light)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-teal)]">
          {t("home.mkt.interactiveDemo.badge")}
        </span>
        <h2 id={headingId} className="mt-[var(--space-4)] text-[28px] font-bold leading-tight tracking-tight text-[var(--color-navy)] sm:text-4xl">
          {t("home.mkt.interactiveDemo.title")}
        </h2>
        <p className="mx-auto mt-[var(--space-3)] max-w-xl text-lg text-[var(--color-slate)]">{t("home.mkt.interactiveDemo.subtitle")}</p>
      </div>

      <div className="mx-auto mt-[var(--space-6)] w-full max-w-[720px] px-[var(--space-4)] sm:px-[var(--space-6)]">
        <div
          className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-modal)]"
          role="region"
          aria-label={t("home.mkt.interactiveDemo.regionLabel")}
        >
          <div className="flex h-12 items-center justify-between bg-[var(--color-teal-deep)] px-[var(--space-4)] text-white">
            <span className="text-sm font-medium">{t("home.mkt.interactiveDemo.topBarLeft")}</span>
            <span className="text-xs text-white/70">{t("home.mkt.interactiveDemo.topBarRight")}</span>
          </div>

          {/* Progress */}
          <div className="border-b border-[var(--color-border-light)] bg-[var(--color-bg)] px-[var(--space-4)] py-[var(--space-3)]">
            <ol className="flex flex-wrap items-center justify-center gap-2 sm:gap-4" aria-label={t("home.mkt.interactiveDemo.progressLabel")}>
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="flex items-center gap-2">
                  {n > 1 && (
                    <span className="hidden h-px w-6 bg-[var(--color-border-light)] sm:block" aria-hidden />
                  )}
                  <span className="flex items-center gap-2">
                    {step > n ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-sage)]" aria-hidden />
                    ) : step === n ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-teal)] text-[10px] font-bold text-white">
                        {n}
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[10px] text-[var(--color-muted)]">
                        {n}
                      </span>
                    )}
                    <span
                      className={
                        step === n
                          ? "text-sm font-semibold text-[var(--color-navy)]"
                          : "text-sm text-[var(--color-muted)]"
                      }
                    >
                      {n === 1 && t("home.mkt.interactiveDemo.prog1")}
                      {n === 2 && t("home.mkt.interactiveDemo.prog2")}
                      {n === 3 && t("home.mkt.interactiveDemo.prog3")}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="p-[var(--space-5)] sm:p-[var(--space-6)]" aria-live="polite">
            {step === 1 && (
              <Step1
                role={role}
                setRole={setRole}
                onContinue={goStep2}
                t={t}
              />
            )}
            {step === 2 && (
              <Step2
                report={report}
                setReport={setReport}
                onContinue={goStep3}
                onBack={() => setStep(1)}
                t={t}
              />
            )}
            {step === 3 && (
              <Step3
                role={role}
                report={report}
                onRestart={reset}
                t={t}
              />
            )}
          </div>
        </div>

        <p className="mt-[var(--space-4)] text-center text-sm text-[var(--color-muted)]">
          <button
            type="button"
            onClick={reset}
            className="text-[var(--color-teal)] underline underline-offset-2 hover:text-[var(--color-teal-deep)]"
          >
            {t("home.mkt.interactiveDemo.restart")}
          </button>
        </p>
      </div>
    </section>
  );
}

function Step1({
  role,
  setRole,
  onContinue,
  t,
}: {
  role: RoleChoice;
  setRole: (r: RoleChoice) => void;
  onContinue: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-[var(--space-5)]">
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-navy)]">{t("home.mkt.interactiveDemo.s1Title")}</h3>
        <p className="mt-2 text-base text-[var(--color-slate)]">{t("home.mkt.interactiveDemo.s1Sub")}</p>
      </div>
      <p className="text-base font-medium text-[var(--color-charcoal)]">{t("home.mkt.interactiveDemo.s1Q")}</p>
      <div className="flex flex-col gap-[var(--space-3)]">
        {(
          [
            ["victim", t("home.mkt.interactiveDemo.s1O1")],
            ["family", t("home.mkt.interactiveDemo.s1O2")],
            ["unsure", t("home.mkt.interactiveDemo.s1O3")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setRole(key)}
            className={`min-h-[52px] rounded-[var(--radius-md)] border-[1.5px] px-[var(--space-4)] text-left text-sm font-medium transition-colors ${
              role === key
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)] text-[var(--color-navy)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-charcoal)] hover:border-[var(--color-teal)]/50 hover:bg-[var(--color-teal-light)]/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-sm text-[var(--color-muted)]">{t("home.mkt.interactiveDemo.s1Hint")}</p>

      {role && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-teal-light)] p-[var(--space-5)]">
          <div className="flex gap-3">
            {role === "unsure" ? (
              <HelpCircle className="h-6 w-6 shrink-0 text-[var(--color-gold)]" aria-hidden />
            ) : (
              <CheckCircle2 className="h-6 w-6 shrink-0 text-[var(--color-sage)]" aria-hidden />
            )}
            <p className="text-sm leading-relaxed text-[var(--color-charcoal)]">
              {role === "victim" && t("home.mkt.interactiveDemo.s1Rv")}
              {role === "family" && t("home.mkt.interactiveDemo.s1Rf")}
              {role === "unsure" && t("home.mkt.interactiveDemo.s1Ru")}
            </p>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="mt-[var(--space-4)] flex h-[52px] w-full items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-teal-deep)] text-base font-medium text-white hover:bg-[var(--color-teal)] transition-colors"
          >
            {t("home.mkt.interactiveDemo.toStep2")}
          </button>
        </div>
      )}

      <p className="text-center text-sm">
        <Link href={INTAKE_HREF} className="font-medium text-[var(--color-teal)] underline underline-offset-2 hover:text-[var(--color-teal-deep)]">
          {t("home.mkt.interactiveDemo.skipReal")}
        </Link>
      </p>
    </div>
  );
}

function Step2({
  report,
  setReport,
  onContinue,
  onBack,
  t,
}: {
  report: ReportChoice;
  setReport: (r: ReportChoice) => void;
  onContinue: () => void;
  onBack: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-[var(--space-5)]">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-[var(--color-teal)] underline underline-offset-2 hover:text-[var(--color-teal-deep)]"
      >
        {t("home.mkt.interactiveDemo.back")}
      </button>
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-navy)]">{t("home.mkt.interactiveDemo.s2Title")}</h3>
        <p className="mt-2 text-base text-[var(--color-slate)]">{t("home.mkt.interactiveDemo.s2Ctx")}</p>
      </div>
      <p className="text-base font-medium text-[var(--color-charcoal)]">{t("home.mkt.interactiveDemo.s2Q")}</p>
      <div className="flex flex-col gap-[var(--space-3)]">
        {(
          [
            ["yes", t("home.mkt.interactiveDemo.s2O1")],
            ["no", t("home.mkt.interactiveDemo.s2O2")],
            ["unsure", t("home.mkt.interactiveDemo.s2O3")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setReport(key)}
            className={`min-h-[52px] rounded-[var(--radius-md)] border-[1.5px] px-[var(--space-4)] text-left text-sm font-medium transition-colors ${
              report === key
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)] text-[var(--color-navy)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-charcoal)] hover:border-[var(--color-teal)]/50 hover:bg-[var(--color-teal-light)]/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {report && (
        <div
          className={`rounded-[var(--radius-lg)] p-[var(--space-5)] ${
            report === "yes"
              ? "bg-[var(--color-sage-light)]"
              : report === "no"
                ? "bg-[var(--color-gold-light)]"
                : "bg-[var(--color-teal-light)]"
          }`}
        >
          <div className="flex gap-3">
            {report === "yes" && <CheckCircle2 className="h-6 w-6 shrink-0 text-[var(--color-sage)]" aria-hidden />}
            {report === "no" && <AlertCircle className="h-6 w-6 shrink-0 text-[var(--color-gold)]" aria-hidden />}
            {report === "unsure" && <HelpCircle className="h-6 w-6 shrink-0 text-[var(--color-teal-soft)]" aria-hidden />}
            <div className="space-y-2 text-sm leading-relaxed text-[var(--color-charcoal)]">
              {report === "yes" && <p>{t("home.mkt.interactiveDemo.s2Ry")}</p>}
              {report === "no" && (
                <>
                  <p>{t("home.mkt.interactiveDemo.s2Rn")}</p>
                  <p className="text-[var(--color-slate)]">{t("home.mkt.interactiveDemo.s2RnNote")}</p>
                </>
              )}
              {report === "unsure" && <p>{t("home.mkt.interactiveDemo.s2Ru")}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="mt-[var(--space-4)] flex h-[52px] w-full items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-teal-deep)] text-base font-medium text-white hover:bg-[var(--color-teal)] transition-colors"
          >
            {t("home.mkt.interactiveDemo.toStep3")}
          </button>
        </div>
      )}

      <p className="text-center text-sm">
        <Link href={INTAKE_HREF} className="font-medium text-[var(--color-teal)] underline underline-offset-2 hover:text-[var(--color-teal-deep)]">
          {t("home.mkt.interactiveDemo.skipReal")}
        </Link>
      </p>
    </div>
  );
}

function Step3({
  role,
  report,
  onRestart,
  t,
}: {
  role: RoleChoice;
  report: ReportChoice;
  onRestart: () => void;
  t: (k: string) => string;
}) {
  const policeDone = report === "yes";
  const familyNeed = role === "family";

  return (
    <div className="space-y-[var(--space-5)]">
      <h3 className="text-xl font-semibold text-[var(--color-navy)]">{t("home.mkt.interactiveDemo.s3Title")}</h3>
      <p className="text-sm text-[var(--color-slate)]">{t("home.mkt.interactiveDemo.s3Intro")}</p>
      <ul className="space-y-2 text-sm text-[var(--color-charcoal)]">
        <CheckRow done={policeDone} text={t("home.mkt.interactiveDemo.s3L1")} />
        <CheckRow done={false} text={t("home.mkt.interactiveDemo.s3L2")} />
        <CheckRow done={false} text={t("home.mkt.interactiveDemo.s3L3")} />
        {familyNeed && <CheckRow done={false} text={t("home.mkt.interactiveDemo.s3L4")} />}
      </ul>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-surface-2)] p-[var(--space-5)]">
        <p className="text-sm font-medium text-[var(--color-charcoal)]">{t("home.mkt.interactiveDemo.s3EstTitle")}</p>
        <dl className="mt-3 space-y-2 text-sm text-[var(--color-slate)]">
          <div className="flex justify-between gap-4">
            <dt>{t("home.mkt.interactiveDemo.s3Est1Label")}</dt>
            <dd className="font-semibold text-[var(--color-navy)]">{t("home.mkt.interactiveDemo.s3Est1Val")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>{t("home.mkt.interactiveDemo.s3Est2Label")}</dt>
            <dd className="font-semibold text-[var(--color-teal-deep)]">{t("home.mkt.interactiveDemo.s3Est2Val")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>{t("home.mkt.interactiveDemo.s3Est3Label")}</dt>
            <dd className="font-semibold text-[var(--color-warning)]">{t("home.mkt.interactiveDemo.s3Est3Val")}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-[var(--space-3)] sm:flex-row">
        <Link
          href={INTAKE_HREF}
          className="inline-flex h-[52px] flex-1 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-teal-deep)] text-center text-base font-medium text-white hover:bg-[var(--color-teal)] transition-colors"
        >
          {t("home.mkt.interactiveDemo.s3CtaStart")}
        </Link>
        <a
          href="#convert"
          className="inline-flex h-[52px] flex-1 items-center justify-center rounded-[var(--radius-sm)] border-[1.5px] border-[var(--color-border)] bg-white text-center text-base font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-surface)] transition-colors"
        >
          {t("home.mkt.interactiveDemo.s3CtaHelp")}
        </a>
      </div>

      <p className="text-center text-xs text-[var(--color-muted)]">{t("home.mkt.interactiveDemo.s3Disclaimer")}</p>

      <p className="text-center text-sm">
        <button
          type="button"
          onClick={onRestart}
          className="text-[var(--color-teal)] underline underline-offset-2 hover:text-[var(--color-teal-deep)]"
        >
          {t("home.mkt.interactiveDemo.restart")}
        </button>
      </p>
    </div>
  );
}

function CheckRow({ done, text }: { done: boolean; text: string }) {
  return (
    <li className="flex items-start gap-2">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-sage)]" aria-hidden />
      ) : (
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-gold)]"
          aria-hidden
        />
      )}
      <span>{text}</span>
    </li>
  );
}
