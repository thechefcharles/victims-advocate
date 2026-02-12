// app/compensation/eligibility/[id]/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import {
  emptyEligibilityAnswers,
  computeEligibilityOutcome,
  type EligibilityCheckAnswers,
  type ApplicantType,
  type VictimStatusAnswer,
  type SignerAnswer,
  type PoliceReportAnswer,
  type PoliceReportDetailsAnswer,
  type ExpenseType,
  type ContactReliabilityAnswer,
  type EligibilityOutcome,
} from "@/lib/eligibilitySchema";

const QUESTIONS = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
] as const;

export default function EligibilityCheckPage() {
  const params = useParams();
  const router = useRouter();
  const { t, tf } = useI18n();
  const { accessToken } = useAuth();

  const caseId = typeof params.id === "string" ? params.id : null;
  const [answers, setAnswers] = useState<EligibilityCheckAnswers>(emptyEligibilityAnswers);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<EligibilityOutcome | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Verify case access
  useEffect(() => {
    if (!caseId || !accessToken) return;

    const check = async () => {
      const res = await fetch(`/api/compensation/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        setLoadErr("Case not found or access denied");
      }
    };
    check();
  }, [caseId, accessToken]);

  const saveResult = useCallback(async () => {
    if (!caseId || !accessToken) return;

    const outcome = computeEligibilityOutcome(answers);
    setSaving(true);
    try {
      const res = await fetch(`/api/compensation/cases/${caseId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eligibility_answers: answers,
          eligibility_result: outcome.result,
          eligibility_readiness: outcome.readiness,
        }),
      });
      if (res.ok) {
        setResult(outcome);
      } else {
        throw new Error("Save failed");
      }
    } catch {
      setLoadErr("Failed to save eligibility check");
    } finally {
      setSaving(false);
    }
  }, [caseId, accessToken, answers]);

  const handleNext = () => {
    if (step < QUESTIONS.length - 1) {
      setStep((s) => s + 1);
    } else {
      saveResult();
    }
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const canProceed = () => {
    const q = QUESTIONS[step];
    if (q === "q1") return answers.applicantType !== null;
    if (q === "q2") return answers.victimUnder18OrDisabled !== null;
    if (q === "q3") return answers.whoWillSign !== null;
    if (q === "q4") return answers.crimeReportedToPolice !== null;
    if (q === "q5") return answers.policeReportDetails !== null;
    if (q === "q6") return answers.expensesSought.length > 0;
    if (q === "q7") return answers.canReceiveContact45Days !== null;
    return false;
  };

  const toggleExpense = (v: ExpenseType) => {
    setAnswers((a) => ({
      ...a,
      expensesSought: a.expensesSought.includes(v)
        ? a.expensesSought.filter((x) => x !== v)
        : [...a.expensesSought, v],
    }));
  };

  if (!caseId) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto text-red-300">Invalid case</div>
        <Link href="/dashboard" className="text-slate-400 hover:text-slate-200 mt-4 inline-block">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  if (loadErr && !result) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto space-y-4">
          <p className="text-red-300">{loadErr}</p>
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-200">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  // Result screen
  if (result) {
    const intakeHref = `/compensation/intake?case=${caseId}`;

    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto space-y-6">
          <Link
            href="/dashboard"
            className="text-[11px] text-slate-400 hover:text-slate-200"
          >
            ← Back to dashboard
          </Link>

          {result.result === "eligible" && result.readiness === "ready" && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 space-y-4">
              <h1 className="text-xl font-semibold text-emerald-100">
                {t("eligibility.resultEligible.headline")}
              </h1>
              <p className="text-sm text-slate-300">
                {t("eligibility.resultEligible.body")}
              </p>
              <p className="text-xs text-slate-400">
                {t("eligibility.resultEligible.secondary")}
              </p>
              <Link
                href={intakeHref}
                className="inline-block rounded-full bg-[#1C8C8C] px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#21a3a3]"
              >
                {t("eligibility.resultEligible.cta")}
              </Link>
            </div>
          )}

          {(result.result === "eligible" && result.readiness !== "ready") ||
          result.result === "needs_review" ? (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 space-y-4">
              <h1 className="text-xl font-semibold text-amber-100">
                {t("eligibility.resultNeedsAttention.headline")}
              </h1>
              <p className="text-sm text-slate-300">
                {t("eligibility.resultNeedsAttention.body")}
              </p>
              <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i}>
                    {t(`eligibility.resultNeedsAttention.checklist.${i}`)}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={intakeHref}
                  className="rounded-full bg-[#1C8C8C] px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#21a3a3]"
                >
                  {t("eligibility.resultNeedsAttention.ctaReady")}
                </Link>
                <Link
                  href="/help"
                  className="rounded-full border border-slate-600 px-6 py-2.5 text-sm hover:bg-slate-900/60"
                >
                  {t("eligibility.resultNeedsAttention.ctaHelp")}
                </Link>
              </div>
            </div>
          ) : null}

          {result.result === "not_eligible" && (
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-6 space-y-4">
              <h1 className="text-xl font-semibold text-slate-100">
                {t("eligibility.resultNotEligible.headline")}
              </h1>
              <p className="text-sm text-slate-300">
                {t("eligibility.resultNotEligible.body")}
              </p>
              <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                {[0, 1].map((i) => (
                  <li key={i}>
                    {t(`eligibility.resultNotEligible.nextSteps.${i}`)}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400">
                You can still continue to the intake form if you believe you qualify. Your answers do not affect your eligibility.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={intakeHref}
                  className="rounded-full border border-amber-500/50 px-6 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/20"
                >
                  Continue to intake anyway
                </Link>
                <Link
                  href="/help"
                  className="rounded-full border border-slate-600 px-6 py-2.5 text-sm hover:bg-slate-900/60"
                >
                  {t("eligibility.resultNotEligible.cta")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Question wizard
  const q = QUESTIONS[step];
  const stepNum = step + 1;
  const totalNum = QUESTIONS.length;

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <Link
          href="/dashboard"
          className="text-[11px] text-slate-400 hover:text-slate-200"
        >
          ← Back to dashboard
        </Link>

        {step === 0 && (
          <p className="text-sm text-slate-300">
            {t("eligibility.purposeText")}
          </p>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-6">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">
            {tf("eligibility.questionOf", { current: String(stepNum), total: String(totalNum) })}
          </p>

          {q === "q1" && (
            <>
              <h2 className="text-sm font-semibold text-slate-100">
                {t("eligibility.q1.title")}
              </h2>
              <p className="text-sm text-slate-300">{t("eligibility.q1.question")}</p>
              <div className="space-y-2">
                {(["victim_18plus_own", "parent_minor", "parent_disabled", "paid_expenses", "none"] as ApplicantType[]).map((v) => (
                  <label
                    key={v}
                    className="flex items-start gap-2 p-3 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="q1"
                      value={v}
                      checked={answers.applicantType === v}
                      onChange={() =>
                        setAnswers((a) => ({ ...a, applicantType: v }))
                      }
                      className="mt-1"
                    />
                    <span className="text-sm">
                      {t(
                        `eligibility.q1.options.${
                          v === "victim_18plus_own"
                            ? "victim18Own"
                            : v === "parent_minor"
                              ? "parentMinor"
                              : v === "parent_disabled"
                                ? "parentDisabled"
                                : v === "paid_expenses"
                                  ? "paidExpenses"
                                  : "none"
                        }`
                      )}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">{t("eligibility.q1.helper")}</p>
            </>
          )}

          {q === "q2" && (
            <>
              <h2 className="text-sm font-semibold text-slate-100">
                {t("eligibility.q2.title")}
              </h2>
              <p className="text-sm text-slate-300">{t("eligibility.q2.question")}</p>
              <div className="flex flex-wrap gap-2">
                {(["yes", "no", "not_sure"] as VictimStatusAnswer[]).map((v) => (
                  <label
                    key={v}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="q2"
                      value={v}
                      checked={answers.victimUnder18OrDisabled === v}
                      onChange={() =>
                        setAnswers((a) => ({
                          ...a,
                          victimUnder18OrDisabled: v,
                        }))
                      }
                    />
                    <span className="text-sm">{t(`eligibility.q2.${v === "not_sure" ? "notSure" : v}`)}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">{t("eligibility.q2.helper")}</p>
            </>
          )}

          {q === "q3" && (
            <>
              <h2 className="text-sm font-semibold text-slate-100">
                {t("eligibility.q3.title")}
              </h2>
              <p className="text-sm text-slate-300">{t("eligibility.q3.question")}</p>
              <div className="space-y-2">
                {(["applicant", "guardian", "not_sure"] as SignerAnswer[]).map((v) => (
                  <label
                    key={v}
                    className="flex items-start gap-2 p-3 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="q3"
                      value={v}
                      checked={answers.whoWillSign === v}
                      onChange={() =>
                        setAnswers((a) => ({ ...a, whoWillSign: v }))
                      }
                      className="mt-1"
                    />
                    <span className="text-sm">
                      {t(`eligibility.q3.options.${v === "not_sure" ? "notSure" : v}`)}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">{t("eligibility.q3.helper")}</p>
            </>
          )}

          {q === "q4" && (
            <>
              <h2 className="text-sm font-semibold text-slate-100">
                {t("eligibility.q4.title")}
              </h2>
              <p className="text-sm text-slate-300">{t("eligibility.q4.question")}</p>
              <div className="flex flex-wrap gap-2">
                {(["yes", "no", "not_sure"] as PoliceReportAnswer[]).map((v) => (
                  <label
                    key={v}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="q4"
                      value={v}
                      checked={answers.crimeReportedToPolice === v}
                      onChange={() =>
                        setAnswers((a) => ({
                          ...a,
                          crimeReportedToPolice: v,
                        }))
                      }
                    />
                    <span className="text-sm">{t(`eligibility.q4.${v === "not_sure" ? "notSure" : v}`)}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">{t("eligibility.q4.helper")}</p>
            </>
          )}

          {q === "q5" && (
            <>
              <h2 className="text-sm font-semibold text-slate-100">
                {t("eligibility.q5.title")}
              </h2>
              <p className="text-sm text-slate-300">{t("eligibility.q5.question")}</p>
              <div className="space-y-2">
                {(["have_number", "have_agency", "dont_have"] as PoliceReportDetailsAnswer[]).map((v) => (
                  <label
                    key={v}
                    className="flex items-start gap-2 p-3 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="q5"
                      value={v}
                      checked={answers.policeReportDetails === v}
                      onChange={() =>
                        setAnswers((a) => ({
                          ...a,
                          policeReportDetails: v,
                        }))
                      }
                      className="mt-1"
                    />
                    <span className="text-sm">
                      {t(`eligibility.q5.options.${v === "have_number" ? "haveNumber" : v === "have_agency" ? "haveAgency" : "dontHave"}`)}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">{t("eligibility.q5.helper")}</p>
            </>
          )}

          {q === "q6" && (
            <>
              <h2 className="text-sm font-semibold text-slate-100">
                {t("eligibility.q6.title")}
              </h2>
              <p className="text-sm text-slate-300">{t("eligibility.q6.question")}</p>
              <div className="space-y-2">
                {(["medical_hospital", "funeral_burial", "counseling", "not_sure"] as ExpenseType[]).map((v) => (
                  <label
                    key={v}
                    className="flex items-start gap-2 p-3 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={answers.expensesSought.includes(v)}
                      onChange={() => toggleExpense(v)}
                      className="mt-1"
                    />
                    <span className="text-sm">
                      {t(`eligibility.q6.options.${v === "medical_hospital" ? "medical" : v === "funeral_burial" ? "funeral" : v === "counseling" ? "counseling" : "notSure"}`)}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">{t("eligibility.q6.helper")}</p>
            </>
          )}

          {q === "q7" && (
            <>
              <h2 className="text-sm font-semibold text-slate-100">
                {t("eligibility.q7.title")}
              </h2>
              <p className="text-sm text-slate-300">{t("eligibility.q7.question")}</p>
              <div className="flex flex-wrap gap-2">
                {(["yes", "not_sure", "no"] as ContactReliabilityAnswer[]).map((v) => (
                  <label
                    key={v}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="q7"
                      value={v}
                      checked={answers.canReceiveContact45Days === v}
                      onChange={() =>
                        setAnswers((a) => ({
                          ...a,
                          canReceiveContact45Days: v,
                        }))
                      }
                    />
                    <span className="text-sm">{t(`eligibility.q7.${v === "not_sure" ? "notSure" : v}`)}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">{t("eligibility.q7.helper")}</p>
            </>
          )}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className="text-sm text-slate-400 hover:text-slate-200 disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="rounded-full bg-[#1C8C8C] px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-[#21a3a3] disabled:opacity-50"
            >
              {saving ? "Saving…" : step < QUESTIONS.length - 1 ? "Next" : "See results"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
