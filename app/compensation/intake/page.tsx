// app/compensation/intake/page.tsx
"use client";

import { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RecommendedOrganizationCard } from "@/components/trust/RecommendedOrganizationCard";
import { EMPTY_COPY, TRUST_LINK_HREF, TRUST_LINK_LABELS, TRUST_MICROCOPY } from "@/lib/trustDisplay";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n/i18nProvider";
import { useStateSelection } from "@/components/state/StateProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import Link from "next/link";
import {
  getNextActionForCase,
  type CompletenessSignal,
  type EligibilityResult,
} from "@/lib/product/nextAction";
import { priorityBadgeClassName, priorityLabel } from "@/lib/product/priority";

import type {
  VictimInfo,
  ApplicantInfo,
  AdvocateContact,
  CompensationApplication,
  CrimeInfo,
  CourtInfo,  
  LossesClaimed,
  MedicalInfo,
  EmploymentInfo,
  FuneralInfo,
  CertificationInfo,
} from "../../../lib/compensationSchema";
import {
  getFieldStateMap,
  setFieldState,
  mergeFieldState,
  stripFieldState,
  makeSkippedEntry,
  makeDeferredEntry,
  type FieldStateMap,
} from "../../../lib/intake/fieldState";
import { canSkip, canDefer } from "../../../lib/intake/fieldConfig";
import { getReviewStatus } from "../../../lib/intake/reviewStatus";
import { ROUTES, victimCaseMessagesUrl } from "@/lib/routes/pageRegistry";
import { ExplainThisButton } from "@/components/ExplainThis";
import { GroundingPauseBanner } from "@/components/applicant/GroundingPauseBanner";
import {
  applicantSectionComplete,
  victimSectionComplete,
  intakeTabDisplayComplete,
} from "@/lib/intake/stepCompleteness";
import {
  getIntakeStepMissingKeys,
  canContinueFromIntakeStep,
} from "@/lib/intake/intakeStepContinueGate";

type IntakeStep =
  | "applicant"
  | "victim"
  | "crime"
  | "losses"
  | "medical"
  | "employment"
  | "funeral"
  | "documents"
  | "summary";

const INTAKE_STEP_ORDER: IntakeStep[] = [
  "applicant",
  "victim",
  "crime",
  "losses",
  "medical",
  "employment",
  "funeral",
  "documents",
  "summary",
];

const STORAGE_KEY_PREFIX = "nxtstps_compensation_intake_v1";
const ACTIVE_CASE_KEY_PREFIX = "nxtstps_active_case_";
const PROGRESS_KEY_PREFIX = "nxtstps_intake_progress_";
const INTAKE_STEPS_CONTINUED_PREFIX = "nxtstps_intake_steps_continued_";

function isIntakeStepId(v: string): v is IntakeStep {
  return (INTAKE_STEP_ORDER as string[]).includes(v);
}

const emptyVictim: VictimInfo = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  streetAddress: "",
  city: "",
  state: "IL",
  zip: "",
  email: "",
  cellPhone: "",
  alternatePhone: "",
  workPhone: "",
  genderIdentity: "",
  maritalStatus: "",
  race: "",
  ethnicity: "",
  hasDisability: false,
  disabilityType: null,
};

const emptyApplicant: ApplicantInfo = {
  isSameAsVictim: true,
  seekingOwnExpenses: false,
};

const emptyContact: AdvocateContact = {
  prefersEnglish: true,
  workingWithAdvocate: false,
};

const makeEmptyApplication = (): CompensationApplication => ({
  victim: emptyVictim,
  applicant: emptyApplicant,
  contact: emptyContact,
  crime: {
    policeReportNumber: "",
    dateOfCrime: "",
    dateReported: "",
    crimeAddress: "",
    crimeCity: "",
    crimeCounty: "",
    reportingAgency: "",
    crimeDescription: "",
    injuryDescription: "",
    offenderKnown: false,
  },
  court: {},
  protectionAndCivil: {},
  losses: {
    medicalHospital: false,
    dental: false,
    transportation: false,
    accessibilityCosts: false,
    crimeSceneCleanup: false,
    counseling: false,
    relocationCosts: false,
    temporaryLodging: false,
    tattooRemoval: false,
    lossOfEarnings: false,
    tuition: false,
    replacementServiceLoss: false,
    locks: false,
    windows: false,
    clothing: false,
    bedding: false,
    prostheticAppliances: false,
    eyeglassesContacts: false,
    hearingAids: false,
    replacementCosts: false,
    lossOfSupport: false,
    towingStorage: false,
    funeralBurial: false,
    lossOfFutureEarnings: false,
    legalFees: false,
    doors: false,
    headstone: false,
  },
  medical: {
    providers: [],
  },
  employment: {
    isApplyingForLossOfEarnings: false,
    employmentHistory: [],
    // NEW: Benefit breakdown
    sickPayAmount: undefined,
    vacationPayAmount: undefined,
    personalTimeAmount: undefined,
    disabilityPayAmount: undefined,
    otherBenefitAmount: undefined,
  },
  funeral: {
    payments: [],
    cemeteryPayments: [], // NEW: Cemetery payers
    // NEW: Death benefits
    deathBenefitChicagoFund: undefined,
    lifeHealthAccidentInsurance: undefined,
    unemploymentPayments: undefined,
    veteransSocialSecurityBurial: undefined,
    workersCompDramShop: undefined,
    federalMedicarePublicAid: undefined,
  },
  certification: {
    acknowledgesSubrogation: false,
    acknowledgesRelease: false,
    acknowledgesPerjury: false,
  },
});

function CompensationIntakeInner() {
    const router = useRouter();
  const searchParams = useSearchParams();
const caseId = searchParams.get("case"); // ✅ if present, we load case from Supabase
const urlState = searchParams.get("state"); // ?state=IN for Indiana
const { stateCode: globalState } = useStateSelection();
const { t, tf, lang } = useI18n();

  useEffect(() => {
  (async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push("/login");
    }
  })();
}, [router]);

  // Phase 4: require non_legal_advice acceptance before compensation intake
  const [consentChecked, setConsentChecked] = useState(false);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setConsentChecked(true);
        return;
      }
      const res = await fetch("/api/policies/active?workflow_key=compensation_intake", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setConsentChecked(true);
        return;
      }
      const json = await res.json();
      const missing = (json.data?.missing_doc_types ?? []) as string[];
      setConsentChecked(true);
      if (missing.includes("non_legal_advice")) {
        const path = `/compensation/intake${caseId ? `?case=${caseId}` : ""}`;
        router.replace(`/consent?workflow=compensation_intake&redirect=${encodeURIComponent(path)}`);
      }
    })();
  }, [caseId, router]);

  const [step, setStep] = useState<IntakeStep>("applicant");
  const [maxStepIndex, setMaxStepIndex] = useState(0);
  /** User used Continue on a step with no required fields (badges: documents; medical/employment/funeral when no related loss). */
  const [stepsContinuedFrom, setStepsContinuedFrom] = useState<Set<IntakeStep>>(() => new Set());
  const [lossesNoneAck, setLossesNoneAck] = useState(false);
  const [employmentNoEmployerAck, setEmploymentNoEmployerAck] = useState(false);
  const [funeralIncompleteAck, setFuneralIncompleteAck] = useState(false);
  const [requiredFieldsModalOpen, setRequiredFieldsModalOpen] = useState(false);
  /** Linear re-review from summary; tab bar disabled until finished. */
  const [reviewWalkthroughActive, setReviewWalkthroughActive] = useState(false);
  const [reviewWalkthroughVerified, setReviewWalkthroughVerified] = useState<Set<IntakeStep>>(
    () => new Set()
  );
  const [app, setApp] = useState<CompensationApplication>(
    makeEmptyApplication()
  );
  /** Phase 8: per-field state (skipped, deferred, amended). Preserved with application. */
  const [fieldState, setFieldStateLocal] = useState<FieldStateMap>({});

  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true); // ✅ local mode default true
  const [stateCode, setStateCode] = useState<"IL" | "IN">(
    urlState === "IN" ? "IN" : globalState
  );
  const isReadOnly = !!caseId && !canEdit;
const [savingCase, setSavingCase] = useState(false); // ✅ shows "Saving..."
const [saveToast, setSaveToast] = useState<string | null>(null);
const [saveNowLoading, setSaveNowLoading] = useState(false);
  const [autoSaveIssue, setAutoSaveIssue] = useState(false);
  const [autoSaveFlash, setAutoSaveFlash] = useState(false);
const creatingCaseRef = useRef(false);

  /** Loaded from GET /api/compensation/cases/:id — used for next-action on summary */
  const [loadedCaseEligibility, setLoadedCaseEligibility] = useState<EligibilityResult | null>(null);
  const [loadedCaseStatus, setLoadedCaseStatus] = useState<string>("draft");
  const [loadedAssignedAdvocateId, setLoadedAssignedAdvocateId] = useState<string | null>(null);


// per-user storage key (null until user is known)
const storageKey = userId ? `${STORAGE_KEY_PREFIX}_${userId}` : null;

  // 🔵 NxtGuide chat state (ADD THIS HERE)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
  (async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id ?? null);
  })();
}, []);

// ✅ If URL has ?case=..., load that case from Supabase instead of localStorage
useEffect(() => {
  if (!caseId) return;

  (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(`/api/compensation/cases/${caseId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        let errCode: string | undefined;
        try {
          const parsed = JSON.parse(text) as { error?: { code?: string } };
          errCode = parsed?.error?.code;
        } catch {
          /* non-JSON body */
        }
        // 403/404 are common (stale bookmark, wrong org, revoked access) — not a client bug
        const accessOrMissing =
          res.status === 403 ||
          res.status === 404 ||
          errCode === "FORBIDDEN" ||
          errCode === "NOT_FOUND";
        if (accessOrMissing) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "[compensation/intake] Case not loaded (expected for invalid/forbidden id):",
              caseId,
              errCode ?? res.status
            );
          }
        } else {
          console.error("Failed to load case:", text);
        }
        alert(t("intake.loadCase.failed"));
        router.replace("/dashboard");
        return;
      }

      const json = await res.json();
      setCanEdit(!!json.access?.can_edit);
      const sc = json.case?.state_code;
      setStateCode(sc === "IN" ? "IN" : "IL");

      const cr = json.case?.eligibility_result as EligibilityResult | undefined | null;
      setLoadedCaseEligibility(cr ?? null);
      setLoadedCaseStatus(
        typeof json.case?.status === "string" ? json.case.status : "draft"
      );
      setLoadedAssignedAdvocateId(
        (json.case?.assigned_advocate_id as string | null | undefined) ?? null
      );

      const rawApp = json.case.application;
      const loaded = typeof rawApp === "string" ? JSON.parse(rawApp) : rawApp;
      // Phase 8: backward compat – strip _fieldState for form, keep for fieldState
      const loadedApp = stripFieldState((loaded ?? {}) as Record<string, unknown>) as unknown as CompensationApplication;
      const initialFieldState = getFieldStateMap((loaded ?? {}) as Record<string, unknown>);

      setApp(loadedApp);
      setFieldStateLocal(initialFieldState);
      setStep("applicant");
      setMaxStepIndex(0);
      setLoadedFromStorage(true);

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (uid) localStorage.setItem(`${ACTIVE_CASE_KEY_PREFIX}${uid}`, caseId);
      if (uid) {
        try {
          const ack = localStorage.getItem(`${INTAKE_STEPS_CONTINUED_PREFIX}${uid}_${caseId}`);
          if (ack) {
            const arr = JSON.parse(ack) as unknown;
            if (Array.isArray(arr)) {
              const valid = arr.filter((x): x is IntakeStep => typeof x === "string" && isIntakeStepId(x));
              setStepsContinuedFrom(new Set(valid));
            } else {
              setStepsContinuedFrom(new Set());
            }
          } else {
            setStepsContinuedFrom(new Set());
          }
        } catch {
          setStepsContinuedFrom(new Set());
        }
      } else {
        setStepsContinuedFrom(new Set());
      }
    } catch (err) {
      console.error("Unexpected error loading case from API:", err);
      alert(t("intake.loadCase.unexpected"));
      router.replace("/dashboard");
    }
  })();
}, [caseId, router, t]); // ✅ add t

  // When no case, sync state from URL or global
  useEffect(() => {
    if (caseId) return;
    if (urlState === "IN") setStateCode("IN");
    else setStateCode(globalState);
  }, [caseId, urlState, globalState]);

// 🟢 1. Load saved intake once on mount
useEffect(() => {
  if (typeof window === "undefined") return;
  if (caseId) return; // ✅ ADD THIS
  if (!storageKey) return; // ✅ wait until we know which user

  try {
    const raw = localStorage.getItem(storageKey);
    console.log("[INTAKE] load effect: key =", storageKey, "raw =", raw);

    if (raw) {
      const parsed = JSON.parse(raw) as {
        app?: CompensationApplication & { _fieldState?: FieldStateMap };
        step?: IntakeStep;
        maxStepIndex?: number;
        stepsContinuedFrom?: string[];
      };

      if (parsed.app) {
        const loaded = parsed.app as unknown as Record<string, unknown>;
        const stripped = stripFieldState(loaded) as unknown as CompensationApplication;
        setApp(stripped);
        setFieldStateLocal(getFieldStateMap(loaded));
      }
      if (parsed.step) setStep(parsed.step);
      if (typeof parsed.maxStepIndex === "number") setMaxStepIndex(parsed.maxStepIndex);
      if (Array.isArray(parsed.stepsContinuedFrom)) {
        const valid = parsed.stepsContinuedFrom.filter((x): x is IntakeStep => isIntakeStepId(x));
        setStepsContinuedFrom(new Set(valid));
      } else {
        setStepsContinuedFrom(new Set());
      }
    } else {
      // ✅ no saved draft for THIS user → start fresh
      setApp(makeEmptyApplication());
      setStep("applicant");
      setMaxStepIndex(0);
      setStepsContinuedFrom(new Set());
    }
  } catch (err) {
    console.error("Failed to load saved intake from localStorage", err);
  } finally {
    setLoadedFromStorage(true);
  }
}, [storageKey, caseId]);

// ✅ Auto-create a draft case on first load (so we always have a caseId)
useEffect(() => {
  if (caseId) return;
  if (!userId) return;
  if (!loadedFromStorage) return;

  if (creatingCaseRef.current) return;
  creatingCaseRef.current = true;

  (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/compensation/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ application: app, state_code: stateCode }),
      });

      if (!res.ok) {
        console.error("Auto-create case failed:", await res.text());
        setSaveToast(t("intake.startFailed"));
        setTimeout(() => setSaveToast(null), 2500);
        return;
      }

      const json = await res.json();
      const newCaseId = json?.case?.id;

      if (!newCaseId) {
        console.error("Auto-create case returned no id:", json);
        setSaveToast(t("intake.missingCaseId"));
        setTimeout(() => setSaveToast(null), 2500);
        return;
      }

      // ✅ move into case-linked mode
localStorage.setItem(`${ACTIVE_CASE_KEY_PREFIX}${userId}`, newCaseId);
router.replace(`/compensation/intake?case=${newCaseId}`);
setSaveToast(t("intake.started"));
      setTimeout(() => setSaveToast(null), 1500);
      return;
    } catch (e) {
      console.error("Auto-create case error:", e);
      setSaveToast(t("intake.startFailed"));
      setTimeout(() => setSaveToast(null), 2500);
    }
    // ✅ DO NOT set creatingCaseRef.current back to false (prevents double-create in dev)
  })();
}, [caseId, userId, loadedFromStorage, router, app, stateCode]);

// ✅ Remember the most recent active case for this user (used by "Resume Application")
useEffect(() => {
  if (!userId || !caseId) return;
  localStorage.setItem(`nxtstps_active_case_${userId}`, caseId);
}, [userId, caseId]);

useEffect(() => {
  if (!userId) return;

  try {
    localStorage.setItem(
      `${PROGRESS_KEY_PREFIX}${userId}`,
      JSON.stringify({
        caseId: caseId ?? null,
        step,
        maxStepIndex,
        updatedAt: Date.now(),
      })
    );
  } catch (e) {
    console.warn("Failed to store intake progress", e);
  }
}, [userId, caseId, step, maxStepIndex]);

useEffect(() => {
  if (!userId || !caseId) return;
  try {
    localStorage.setItem(
      `${INTAKE_STEPS_CONTINUED_PREFIX}${userId}_${caseId}`,
      JSON.stringify([...stepsContinuedFrom])
    );
  } catch (e) {
    console.warn("Failed to persist intake step acknowledgements", e);
  }
}, [userId, caseId, stepsContinuedFrom]);

useEffect(() => {
  const idx = Math.max(0, INTAKE_STEP_ORDER.indexOf(step));
  setMaxStepIndex((prev) => Math.max(prev, idx));
}, [step]);

// 🟡 2. Auto-save whenever the application or step changes
useEffect(() => {
  if (typeof window === "undefined") return;
  if (caseId) return; // ✅ ADD THIS
  if (!loadedFromStorage) return;
  if (!storageKey) return;

  try {
    const appToStore =
      Object.keys(fieldState).length > 0
        ? mergeFieldState(app as unknown as Record<string, unknown>, fieldState)
        : app;
    const payload = {
      app: appToStore,
      step,
      maxStepIndex,
      stepsContinuedFrom: [...stepsContinuedFrom],
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to save compensation intake to localStorage", err);
  }
}, [caseId, loadedFromStorage, storageKey, app, fieldState, step, maxStepIndex, stepsContinuedFrom]);

// ✅ Case-mode autosave: when ?case=... exists, save edits to Supabase via PATCH
useEffect(() => {
  if (!caseId) return;                 // only in case-link mode
  if (!loadedFromStorage) return;      // wait until case has loaded
  if (!canEdit) return;
  if (savingCase) return; // prevent overlapping saves

  const timeout = setTimeout(async () => {
    try {
      setSavingCase(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const payload = Object.keys(fieldState).length
        ? mergeFieldState(app as unknown as Record<string, unknown>, fieldState)
        : app;
      const res = await fetch(`/api/compensation/cases/${caseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ application: payload }),
      });

      if (!res.ok) {
        console.error("PATCH case save failed:", await res.text());
        setAutoSaveIssue(true);
      } else {
        setAutoSaveIssue(false);
        setAutoSaveFlash(true);
        window.setTimeout(() => setAutoSaveFlash(false), 1200);
      }
    } catch (err) {
      console.error("Failed to autosave case to Supabase", err);
      setAutoSaveIssue(true);
    } finally {
      setSavingCase(false);
    }
  }, 800); // debounce: prevents spam while typing (Phase 3)

  return () => clearTimeout(timeout);
}, [caseId, loadedFromStorage, canEdit, app, fieldState]);

const victim = app.victim;
const applicant = app.applicant;
const contact = app.contact; // NEW
const crime = app.crime;
const certification = app.certification;
const court = app.court;
const losses = app.losses;
const medical = app.medical;
const employment = app.employment;
const funeral = app.funeral;

const intakeReview = useMemo(() => {
  const storedApp =
    app && Object.keys(fieldState).length > 0
      ? mergeFieldState(app as unknown as Record<string, unknown>, fieldState)
      : ((app ?? {}) as unknown as Record<string, unknown>);
  return getReviewStatus(storedApp as Parameters<typeof getReviewStatus>[0]);
}, [app, fieldState]);

const intakeStepIndex = INTAKE_STEP_ORDER.indexOf(step);
const intakeStepCurrent = intakeStepIndex >= 0 ? intakeStepIndex + 1 : 1;
const intakeStepTotal = INTAKE_STEP_ORDER.length;

  const applicantGateComplete = useMemo(
    () => applicantSectionComplete(applicant, contact, stateCode),
    [applicant, contact, stateCode]
  );
  const victimGateComplete = useMemo(
    () => victimSectionComplete(victim, contact, stateCode),
    [victim, contact, stateCode]
  );

  const continueAcks = useMemo(
    () => ({
      lossesNone: lossesNoneAck,
      employmentNoEmployer: employmentNoEmployerAck,
      funeralIncomplete: funeralIncompleteAck,
    }),
    [lossesNoneAck, employmentNoEmployerAck, funeralIncompleteAck]
  );

  const canContinueCurrent = useMemo(() => {
    if (isReadOnly) return true;
    if (step === "summary") return true;
    return canContinueFromIntakeStep(step, app, stateCode, continueAcks);
  }, [isReadOnly, step, app, stateCode, continueAcks]);

  const missingKeysForCurrentStep = useMemo(() => {
    if (step === "summary") return [];
    return getIntakeStepMissingKeys(step, app, stateCode, continueAcks);
  }, [step, app, stateCode, continueAcks]);

  const continuePrimaryEnabled = isReadOnly || canContinueCurrent;
  const continueButtonClass = `text-xs rounded-lg px-4 py-2 font-semibold transition ${
    continuePrimaryEnabled
      ? "bg-[var(--color-teal-deep)] text-white hover:bg-[var(--color-teal)]"
      : "bg-[var(--color-light-sand)] text-[var(--color-muted)] cursor-not-allowed"
  }`;

  const lossCategoryMissingKey = "intake.requiredBeforeContinue.selectLossCategory";
  const employmentMissingKey = "intake.requiredBeforeContinue.employmentEmployerOrConfirm";
  const funeralMissingKey = "intake.requiredBeforeContinue.funeralDetailsOrConfirm";

  useEffect(() => {
    const anySel = Object.entries(losses).some(
      ([k, v]) => k !== "otherExpensesDescription" && v === true
    );
    if (anySel) setLossesNoneAck(false);
  }, [losses]);

  useEffect(() => {
    if (!losses.lossOfEarnings) setEmploymentNoEmployerAck(false);
    const hasEmployer = employment.employmentHistory?.some((e) => e.employerName?.trim());
    if (hasEmployer) setEmploymentNoEmployerAck(false);
  }, [losses.lossOfEarnings, employment.employmentHistory]);

  useEffect(() => {
    const funeralSelected = losses.funeralBurial || losses.headstone;
    if (!funeralSelected) setFuneralIncompleteAck(false);
    const hasData = !!(
      funeral.funeralHomeName?.trim() ||
      funeral.funeralBillTotal ||
      (funeral.payments && funeral.payments.length > 0)
    );
    if (hasData) setFuneralIncompleteAck(false);
  }, [losses.funeralBurial, losses.headstone, funeral.funeralHomeName, funeral.funeralBillTotal, funeral.payments]);

  useEffect(() => {
    if (!loadedFromStorage || isReadOnly || reviewWalkthroughActive) return;
    if (!applicantGateComplete) {
      if (step !== "applicant") setStep("applicant");
      return;
    }
    if (!victimGateComplete) {
      if (step !== "applicant" && step !== "victim") setStep("victim");
    }
  }, [
    loadedFromStorage,
    isReadOnly,
    applicantGateComplete,
    victimGateComplete,
    step,
    reviewWalkthroughActive,
  ]);

  const markStepContinued = useCallback((s: IntakeStep) => {
    setStepsContinuedFrom((prev) => {
      if (prev.has(s)) return prev;
      const next = new Set(prev);
      next.add(s);
      return next;
    });
  }, []);

  const markReviewStepPassed = useCallback((s: IntakeStep) => {
    setReviewWalkthroughVerified((prev) => {
      const next = new Set(prev);
      next.add(s);
      return next;
    });
  }, []);

  const startApplicationReviewWalkthrough = useCallback(() => {
    setReviewWalkthroughVerified(new Set());
    setReviewWalkthroughActive(true);
    setStep("applicant");
  }, []);

  const tryNavigateToIntakeStep = useCallback(
    (target: IntakeStep): boolean => {
      if (isReadOnly) {
        setStep(target);
        return true;
      }
      if (!applicantSectionComplete(applicant, contact, stateCode)) {
        if (target !== "applicant") {
          alert(t("intake.validation.completeApplicantFirst"));
          return false;
        }
      }
      if (
        applicantSectionComplete(applicant, contact, stateCode) &&
        !victimSectionComplete(victim, contact, stateCode) &&
        target !== "applicant" &&
        target !== "victim"
      ) {
        alert(t("intake.validation.completeVictimBeforeOther"));
        setStep("victim");
        return false;
      }
      setStep(target);
      return true;
    },
    [isReadOnly, applicant, contact, stateCode, victim, t]
  );

  const handleStepNav = (target: IntakeStep) => {
    void tryNavigateToIntakeStep(target);
  };

const guardPatch =
  <T,>(fn: (patch: Partial<T>) => void) =>
  (patch: Partial<T>) => {
    if (isReadOnly) {
      setSaveToast(t("intake.viewOnly"));
      setTimeout(() => setSaveToast(null), 2000);
      return;
    }
    fn(patch);
  };

// Wrap the real setters
const updateVictim = guardPatch<VictimInfo>((patch) => {
  setApp((prev) => ({ ...prev, victim: { ...prev.victim, ...patch } }));
});

const updateApplicant = guardPatch<ApplicantInfo>((patch) => {
  setApp((prev) => ({ ...prev, applicant: { ...prev.applicant, ...patch } }));
});

const updateContact = guardPatch<AdvocateContact>((patch) => {
  setApp((prev) => ({ ...prev, contact: { ...prev.contact, ...patch } }));
});

const updateCrime = guardPatch<CrimeInfo>((patch) => {
  setApp((prev) => ({ ...prev, crime: { ...prev.crime, ...patch } }));
});

const updateLosses = guardPatch<LossesClaimed>((patch) => {
  setApp((prev) => ({ ...prev, losses: { ...prev.losses, ...patch } }));
});

const updateCourt = guardPatch<CourtInfo>((patch) => {
  setApp((prev) => ({ ...prev, court: { ...prev.court, ...patch } }));
});

const updateMedical = guardPatch<MedicalInfo>((patch) => {
  setApp((prev) => ({ ...prev, medical: { ...prev.medical, ...patch } }));
});

const updateEmployment = guardPatch<EmploymentInfo>((patch) => {
  setApp((prev) => ({ ...prev, employment: { ...prev.employment, ...patch } }));
});

const updateFuneral = guardPatch<FuneralInfo>((patch) => {
  setApp((prev) => ({ ...prev, funeral: { ...prev.funeral, ...patch } }));
});

const updateCertification = guardPatch<CertificationInfo>((patch) => {
  setApp((prev) => ({
    ...prev,
    certification: { ...prev.certification, ...patch },
  }));
});

const handleDownloadPdf = async () => {
  try {
    const res = await fetch("/api/compensation/summary-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(app),
    });

    if (!res.ok) {
alert(t("intake.pdf.summaryFailed"));
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nxtstps_cvc_summary.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error downloading summary PDF", err);
alert(t("intake.pdf.summaryUnexpected"));
  }
};

const handleSaveNow = async (options?: { showSavedToast?: boolean }): Promise<boolean> => {
  // If this user is viewing a case but can't edit, don't allow saving
  if (caseId && !canEdit) {
    setSaveToast(t("intake.save.viewOnly"));
    setTimeout(() => setSaveToast(null), 2000);
    return false;
  }

  // If there is no caseId (shouldn’t happen after “case created on start”),
  // you can either block or fallback. I’m blocking with a clear message:
  if (!caseId) {
    setSaveToast(t("intake.save.noCaseLoaded"));
    setTimeout(() => setSaveToast(null), 2000);
    return false;
  }

  try {
    setSaveNowLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Not logged in");

    const res = await fetch(`/api/compensation/cases/${caseId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ application: app }),
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    setAutoSaveIssue(false);
    if (options?.showSavedToast !== false) {
      setSaveToast(t("intake.save.saved"));
      setTimeout(() => setSaveToast(null), 2000);
    }
    return true;
  } catch (e) {
    console.error("Save now failed:", e);
    setSaveToast(t("intake.save.failed"));
    setTimeout(() => setSaveToast(null), 2500);
    return false;
  } finally {
    setSaveNowLoading(false);
  }
};
  
  const handleNextFromVictim = () => {
    if (!isReadOnly && !canContinueFromIntakeStep("victim", app, stateCode, continueAcks)) return;
    if (!isReadOnly && !victimSectionComplete(victim, contact, stateCode)) return;
    if (!isReadOnly && applicant.isSameAsVictim) {
      setApp((prev) => ({
        ...prev,
        applicant: {
          ...prev.applicant,
          firstName: prev.victim.firstName,
          lastName: prev.victim.lastName,
          dateOfBirth: prev.victim.dateOfBirth,
          streetAddress: prev.victim.streetAddress,
          apt: prev.victim.apt,
          city: prev.victim.city,
          state: prev.victim.state,
          zip: prev.victim.zip,
          email: prev.victim.email,
          cellPhone: prev.victim.cellPhone,
          alternatePhone: prev.victim.alternatePhone,
          workPhone: prev.victim.workPhone,
          ...(stateCode === "IN" && prev.victim.last4SSN
            ? { last4SSN: prev.victim.last4SSN }
            : {}),
        },
      }));
    }
    if (reviewWalkthroughActive) markReviewStepPassed("victim");
    markStepContinued("victim");
    setStep("crime");
  };

  const handleDownloadOfficialIlPdf = async () => {
    try {
      const res = await fetch("/api/compensation/official-pdf/il", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application: app }),
      });
      if (!res.ok) {
        console.error("IL official PDF error:", await res.text());
        alert(t("intake.pdf.officialFailed"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Illinois_CVC_Application_Filled.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading IL official PDF", err);
      alert(t("intake.pdf.officialUnexpected"));
    }
  };

  const handleDownloadOfficialInPdf = async () => {
    try {
      const res = await fetch("/api/compensation/official-pdf/in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application: app }),
      });
      if (!res.ok) {
        console.error("IN official PDF error:", await res.text());
        alert(t("intake.pdf.officialFailed"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Indiana_CVC_Application_Filled.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading IN official PDF", err);
      alert(t("intake.pdf.officialUnexpected"));
    }
  };

const handleSaveCase = async () => {
  if (
    !certification.applicantSignatureName ||
    !certification.applicantSignatureDate ||
    !certification.acknowledgesSubrogation ||
    !certification.acknowledgesRelease ||
    !certification.acknowledgesPerjury
  ) {
alert(t("intake.validation.certificationRequired"));
    return;
  }

  try {
    const applicationPayload =
      Object.keys(fieldState).length > 0
        ? mergeFieldState(app as unknown as Record<string, unknown>, fieldState)
        : app;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    const res = await fetch("/api/compensation/cases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ application: applicationPayload, state_code: stateCode }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Save case failed:", res.status, text);
alert(t("intake.saveCase.failed"));
      return;
    }

const json = await res.json();
console.log("Saved case response:", json);

const newCaseId = json?.case?.id;

if (!newCaseId) {
alert(t("intake.saveCase.missingId"));
  return;
}

// ✅ redirect into case-linked mode
router.push(`/compensation/intake?case=${newCaseId}`);
  } catch (err) {
    console.error("Error calling /api/compensation/cases", err);
alert(t("intake.saveCase.unexpected"));
  }
};

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const newMessages = [
      ...chatMessages,
      { role: "user" as const, content: trimmed },
    ];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/nxtguide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages,
          currentRoute: "/compensation/intake",
          currentStep: step,
          application: app,
          locale: lang,
        }),
      });

      if (res.status === 403) {
        const json = await res.json().catch(() => ({}));
        if ((json as { error?: { code?: string } })?.error?.code === "CONSENT_REQUIRED") {
          const path = `/compensation/intake${caseId ? `?case=${caseId}` : ""}`;
          router.replace(`/consent?workflow=ai_chat&redirect=${encodeURIComponent(path)}`);
          return;
        }
      }

      if (!res.ok) {
        console.error("NxtGuide error:", await res.text());
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: t("nxtGuide.errors.respondFailed"),
          },
        ]);
        return;
      }

      const json = (await res.json()) as { reply?: unknown };
      const raw = json?.reply;
      const reply =
        typeof raw === "string"
          ? raw
          : raw != null && typeof raw === "object" && "message" in (raw as object)
            ? String((raw as { message?: unknown }).message ?? "")
            : raw != null
              ? String(raw)
              : "";

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
    } catch (err) {
      console.error("NxtGuide error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
content: t("nxtGuide.errors.technicalProblem")
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleNextFromApplicant = () => {
    if (!isReadOnly && !canContinueFromIntakeStep("applicant", app, stateCode, continueAcks)) return;
    if (!isReadOnly && !applicantSectionComplete(applicant, contact, stateCode)) return;
    if (reviewWalkthroughActive) markReviewStepPassed("applicant");
    markStepContinued("applicant");
    setStep("victim");
  };

  const handleNextFromCrime = () => {
    if (!isReadOnly && !canContinueFromIntakeStep("crime", app, stateCode, continueAcks)) return;
    if (
      !crime.dateOfCrime ||
      !crime.crimeAddress.trim() ||
      !crime.crimeCity.trim() ||
      !crime.reportingAgency.trim()
    ) {
      return;
    }
    if (reviewWalkthroughActive) markReviewStepPassed("crime");
    markStepContinued("crime");
    setStep("losses");
  };

  const handleNextFromLosses = () => {
    if (!isReadOnly && !canContinueFromIntakeStep("losses", app, stateCode, continueAcks)) return;
    if (reviewWalkthroughActive) markReviewStepPassed("losses");
    markStepContinued("losses");
    setStep("medical");
  };

const handleNextFromMedical = () => {
  if (!isReadOnly && !canContinueFromIntakeStep("medical", app, stateCode, continueAcks)) return;
  if (reviewWalkthroughActive) markReviewStepPassed("medical");
  markStepContinued("medical");
  setStep("employment");
};

const handleNextFromEmployment = () => {
  if (!isReadOnly && !canContinueFromIntakeStep("employment", app, stateCode, continueAcks)) return;
  if (reviewWalkthroughActive) markReviewStepPassed("employment");
  markStepContinued("employment");
  setStep("funeral");
};

const handleNextFromFuneral = () => {
  if (!isReadOnly && !canContinueFromIntakeStep("funeral", app, stateCode, continueAcks)) return;
  if (reviewWalkthroughActive) markReviewStepPassed("funeral");
  markStepContinued("funeral");
  setStep("documents");
};


const handleBack = () => {
  if (reviewWalkthroughActive && step === "applicant") {
    setReviewWalkthroughActive(false);
    setReviewWalkthroughVerified(new Set());
    setStep("summary");
    return;
  }
  if (step === "applicant") return;
  else if (step === "victim") setStep("applicant");
  else if (step === "crime") setStep("victim");
  else if (step === "losses") setStep("crime");
  else if (step === "medical") setStep("losses");
  else if (step === "employment") setStep("medical");
  else if (step === "funeral") setStep("employment");
  else if (step === "documents") setStep("funeral"); // ✅ add this
  else if (step === "summary") setStep("documents");  // ✅ summary goes back to documents
};

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <PageHeader
          eyebrow={t("intake.header.badge")}
          contextLine={`${t("intake.header.title")} → ${t(`intake.steps.${step}`)}`}
          title={t("intake.header.title")}
          subtitle={t("intake.header.subtitle")}
          meta={
            <>
              {t("intake.header.needMoreContext")}{" "}
              <a
                href="/knowledge/compensation"
                className="text-[var(--color-slate)] hover:text-white underline underline-offset-2"
              >
                {t("intake.header.learnLink")}
              </a>
            </>
          }
        />

        <p className="text-xs text-[var(--color-muted)] -mt-4">{t("intake.reassurance")}</p>

        {autoSaveIssue && caseId && canEdit && (
          <div
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-charcoal)]"
            role="status"
          >
            {t("intake.pathwaySafety.autosaveTrouble")}
          </div>
        )}

        {(step === "victim" || step === "crime") && !isReadOnly && (
          <p className="text-[11px] text-[var(--color-muted)] -mt-2">
            {t("intake.pathwaySafety.sensitiveSectionHint")}
          </p>
        )}

        {isReadOnly && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            {t("intake.viewOnlyBanner")}
          </div>
        )}

        {/* Step indicator */}
<div className="space-y-3">
<p className="text-xs text-[var(--color-muted)]">
  {tf("intake.stepOf", { current: String(intakeStepCurrent), total: String(intakeStepTotal) })}
</p>
<div className="flex flex-wrap gap-2 text-xs text-[var(--color-slate)]">
            <StepBadge
              label={t("intake.steps.applicant")}
              active={step === "applicant"}
              complete={intakeTabDisplayComplete("applicant", app, stateCode, stepsContinuedFrom)}
              reviewed={reviewWalkthroughVerified.has("applicant")}
              disabled={reviewWalkthroughActive}
              onClick={() => handleStepNav("applicant")}
            />
            <StepBadge
              label={t("intake.steps.victim")}
              active={step === "victim"}
              complete={intakeTabDisplayComplete("victim", app, stateCode, stepsContinuedFrom)}
              reviewed={reviewWalkthroughVerified.has("victim")}
              disabled={reviewWalkthroughActive}
              onClick={() => handleStepNav("victim")}
            />
            <StepBadge
              label={t("intake.steps.crime")}
              active={step === "crime"}
              complete={intakeTabDisplayComplete("crime", app, stateCode, stepsContinuedFrom)}
              reviewed={reviewWalkthroughVerified.has("crime")}
              disabled={reviewWalkthroughActive}
              onClick={() => handleStepNav("crime")}
            />
            <StepBadge
              label={t("intake.steps.losses")}
              active={step === "losses"}
              complete={intakeTabDisplayComplete("losses", app, stateCode, stepsContinuedFrom)}
              reviewed={reviewWalkthroughVerified.has("losses")}
              disabled={reviewWalkthroughActive}
              onClick={() => handleStepNav("losses")}
            />
            <StepBadge
              label={t("intake.steps.medical")}
              active={step === "medical"}
              complete={intakeTabDisplayComplete("medical", app, stateCode, stepsContinuedFrom)}
              reviewed={reviewWalkthroughVerified.has("medical")}
              disabled={reviewWalkthroughActive}
              onClick={() => handleStepNav("medical")}
            />
            <StepBadge
              label={t("intake.steps.employment")}
              active={step === "employment"}
              complete={intakeTabDisplayComplete("employment", app, stateCode, stepsContinuedFrom)}
              reviewed={reviewWalkthroughVerified.has("employment")}
              disabled={reviewWalkthroughActive}
              onClick={() => handleStepNav("employment")}
            />
            <StepBadge
              label={t("intake.steps.funeral")}
              active={step === "funeral"}
              complete={intakeTabDisplayComplete("funeral", app, stateCode, stepsContinuedFrom)}
              reviewed={reviewWalkthroughVerified.has("funeral")}
              disabled={reviewWalkthroughActive}
              onClick={() => handleStepNav("funeral")}
            />
            <StepBadge
              label={t("intake.steps.documents")}
              active={step === "documents"}
              complete={intakeTabDisplayComplete("documents", app, stateCode, stepsContinuedFrom)}
              reviewed={reviewWalkthroughVerified.has("documents")}
              disabled={reviewWalkthroughActive}
              onClick={() => handleStepNav("documents")}
            />
            <StepBadge
              label={t("intake.steps.summary")}
              active={step === "summary"}
              complete={intakeTabDisplayComplete("summary", app, stateCode, stepsContinuedFrom)}
              reviewed={false}
              disabled={reviewWalkthroughActive}
              onClick={() => handleStepNav("summary")}
            />
</div>
{reviewWalkthroughActive && (
  <p className="text-[11px] text-emerald-200/90 rounded-lg border border-emerald-500/35 bg-emerald-950/35 px-3 py-2">
    {t("intake.requiredBeforeContinue.reviewModeBanner")}
  </p>
)}
</div>

        {/* Step content */}
<div className="space-y-10">
{step === "applicant" && (
  <>
    <ApplicantForm applicant={applicant} onChange={updateApplicant} stateCode={stateCode} isReadOnly={isReadOnly} />
    <ContactForm contact={contact} onChange={updateContact} stateCode={stateCode} isReadOnly={isReadOnly} />
  </>
)}

{step === "victim" && (
  <div className="nxt-sensitive-section">
    <VictimForm
      victim={victim}
      contact={contact}
      onChange={updateVictim}
      onContactChange={updateContact}
      stateCode={stateCode}
      isReadOnly={isReadOnly}
    />
  </div>
)}

{step === "crime" && (
  <div className="nxt-sensitive-section space-y-8">
    <CrimeForm
      crime={crime}
      onChange={updateCrime}
      stateCode={stateCode}
      isReadOnly={isReadOnly}
      fieldState={fieldState}
      caseId={caseId}
      onSkip={async (fieldKey) => {
        if (caseId) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            const res = await fetch("/api/intake/skip", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ caseId, fieldKey }),
            });
            if (res.ok) {
              const json = await res.json();
              const updated = json?.data?.application;
              if (updated?._fieldState) setFieldStateLocal(updated._fieldState);
            }
          } catch (e) {
            console.error("Skip failed", e);
          }
        } else {
          setFieldStateLocal((prev) => setFieldState(prev, fieldKey, makeSkippedEntry("user")));
        }
      }}
      onDefer={async (fieldKey) => {
        if (caseId) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            const res = await fetch("/api/intake/defer", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ caseId, fieldKey }),
            });
            if (res.ok) {
              const json = await res.json();
              const updated = json?.data?.application;
              if (updated?._fieldState) setFieldStateLocal(updated._fieldState);
            }
          } catch (e) {
            console.error("Defer failed", e);
          }
        } else {
          setFieldStateLocal((prev) => setFieldState(prev, fieldKey, makeDeferredEntry("user")));
        }
      }}
    />
    <CourtForm court={court} onChange={updateCourt} stateCode={stateCode} isReadOnly={isReadOnly} />
  </div>
)}

{step === "losses" && (
<LossesForm losses={losses} onChange={updateLosses} stateCode={stateCode} isReadOnly={isReadOnly} />
)}

{step === "medical" && (
  <MedicalForm medical={medical} onChange={updateMedical} isReadOnly={isReadOnly} />
)}

{step === "employment" && (
  <EmploymentForm employment={employment} onChange={updateEmployment} isReadOnly={isReadOnly} />
)}

{step === "funeral" && (
  <FuneralForm funeral={funeral} onChange={updateFuneral} isReadOnly={isReadOnly} />
)}

{step === "documents" && <DocumentsStep isReadOnly={isReadOnly} />}

{step === "summary" && (
  <SummaryView
    caseId={caseId}
    stateCode={stateCode}
    isReadOnly={isReadOnly}
    victim={victim}
    applicant={applicant}
    crime={crime}
    losses={losses}
    medical={medical}
    employment={employment}
    funeral={funeral}
    certification={certification}
    onChangeCertification={updateCertification}
    onDownloadSummaryPdf={handleDownloadPdf}
    onDownloadOfficialIlPdf={handleDownloadOfficialIlPdf}
    onDownloadOfficialInPdf={handleDownloadOfficialInPdf}
    onSaveCase={handleSaveCase}
    fieldState={fieldState}
    app={app}
    onGoToStep={handleStepNav}
    maxStepIndex={maxStepIndex}
    canRunMatch={canEdit && !isReadOnly}
    caseEligibilityResult={loadedCaseEligibility}
    caseStatus={loadedCaseStatus}
    assignedAdvocateId={loadedAssignedAdvocateId}
    onReviewApplication={!isReadOnly && canEdit ? startApplicationReviewWalkthrough : undefined}
  />
)}
</div>

{/* Nav buttons + primary actions */}
<div className="flex flex-col gap-3 pt-6 border-t border-[var(--color-border-light)] sm:flex-row sm:items-center sm:justify-between">
{/* Left side: Back + Save */}
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={handleBack}
    disabled={step === "applicant" && !reviewWalkthroughActive}
    className="text-xs rounded-lg border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
  >
{t("intake.actions.back")}
  </button>

  <button
    type="button"
    onClick={() => void handleSaveNow()}
    disabled={saveNowLoading || !caseId || !canEdit}
    className="text-xs rounded-lg border border-[var(--color-border)] px-3 py-1.5 hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed"
title={
  !caseId
    ? t("intake.actions.creatingCase")
    : !canEdit
    ? t("intake.actions.viewOnlyTitle")
    : ""
}
  >
{saveNowLoading ? t("intake.actions.saving") : t("intake.actions.save")}
  </button>

  {caseId && canEdit && (
    <button
      type="button"
      onClick={async () => {
        const ok = await handleSaveNow({ showSavedToast: false });
        if (!ok) return;
        setSaveToast(t("intake.pathwaySafety.saveReturnToast"));
        window.setTimeout(() => {
          setSaveToast(null);
          router.push(ROUTES.victimDashboard);
        }, 2200);
      }}
      disabled={saveNowLoading}
      className="text-xs rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-charcoal)] hover:bg-white transition disabled:opacity-40"
    >
      {t("intake.actions.saveAndExit")}
    </button>
  )}

  {caseId && canEdit && savingCase && (
    <span className="text-[11px] text-[var(--color-muted)]">{t("intake.actions.autoSaving")}</span>
  )}
  {caseId && canEdit && autoSaveFlash && !savingCase && (
    <span className="text-[11px] text-[var(--color-muted)]">{t("intake.pathwaySafety.autoSaved")}</span>
  )}
</div>

  {/* Right side: step-specific primary button */}
  <div className="flex flex-col items-end gap-1.5">
    {step !== "summary" && !isReadOnly && !continuePrimaryEnabled && (
      <button
        type="button"
        onClick={() => setRequiredFieldsModalOpen(true)}
        className="text-[11px] text-[var(--color-teal)] hover:text-[var(--color-teal-deep)] underline underline-offset-2"
      >
        {t("intake.requiredBeforeContinue.viewRequiredItems")}
      </button>
    )}
    <div className="flex items-center justify-end">
    {step === "applicant" && (
      <button
        type="button"
        onClick={handleNextFromApplicant}
        disabled={!continuePrimaryEnabled}
        className={continueButtonClass}
      >
{t("intake.actions.continue")}
      </button>
    )}

    {step === "victim" && (
      <button
        type="button"
        onClick={handleNextFromVictim}
        disabled={!continuePrimaryEnabled}
        className={continueButtonClass}
      >
{t("intake.actions.continue")}
      </button>
    )}

    {step === "crime" && (
      <button
        type="button"
        onClick={handleNextFromCrime}
        disabled={!continuePrimaryEnabled}
        className={continueButtonClass}
      >
{t("intake.actions.continue")}
      </button>
    )}

    {step === "losses" && (
      <button
        type="button"
        onClick={handleNextFromLosses}
        disabled={!continuePrimaryEnabled}
        className={continueButtonClass}
      >
{t("intake.actions.continue")}
      </button>
    )}

    {step === "medical" && (
      <button
        type="button"
        onClick={handleNextFromMedical}
        disabled={!continuePrimaryEnabled}
        className={continueButtonClass}
      >
{t("intake.actions.continue")}
      </button>
    )}

    {step === "employment" && (
      <button
        type="button"
        onClick={handleNextFromEmployment}
        disabled={!continuePrimaryEnabled}
        className={continueButtonClass}
      >
{t("intake.actions.continue")}
      </button>
    )}

    {step === "funeral" && (
      <button
        type="button"
        onClick={handleNextFromFuneral}
        disabled={!continuePrimaryEnabled}
        className={continueButtonClass}
      >
{t("intake.actions.continue")}
      </button>
    )}

    {step === "documents" && (
      <button
        type="button"
        disabled={!continuePrimaryEnabled}
        className={continueButtonClass}
        onClick={() => {
          if (!continuePrimaryEnabled) return;
          if (tryNavigateToIntakeStep("summary")) {
            markStepContinued("documents");
            if (reviewWalkthroughActive) {
              markReviewStepPassed("documents");
              setReviewWalkthroughActive(false);
            }
          }
        }}
      >
{t("intake.actions.continue")}
      </button>
    )}

    {step === "summary" &&
      (intakeReview.missing.length > 0 ? (
        <button
          type="button"
          onClick={() => handleStepNav(intakeReview.missing[0].stepHint as IntakeStep)}
          className="text-xs rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 font-semibold text-white hover:bg-[var(--color-teal)] transition"
        >
          {t("intake.actions.continue")}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setSaveToast(t("forms.summary.placeholders.alreadyFinalReview"))}
          className="text-xs rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 font-semibold text-white hover:bg-[var(--color-teal)] transition"
        >
          {t("intake.actions.reviewSubmit")}
        </button>
      ))}
    </div>
  </div>
</div>

        <p className="text-[11px] text-[var(--color-muted)]">
{t("intake.footer.draftDisclaimer")}
        </p>

      </div>

            {/* NxtGuide chat widget (intake) */}
      <div
        className="fixed right-4 z-40"
        style={{ bottom: "max(5.75rem, calc(4.75rem + env(safe-area-inset-bottom, 0px)))" }}
      >
        {chatOpen ? (
          <div className="w-72 sm:w-80 rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-white)] shadow-lg shadow-[var(--shadow-modal)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-light)] bg-white">
              <div className="text-[11px]">
                <div className="font-semibold text-[var(--color-navy)]">NxtGuide</div>
                <div className="text-[var(--color-slate)]">
{t("nxtGuide.subtitle")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-[var(--color-muted)] hover:text-[var(--color-charcoal)] text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-[11px]">
              {chatMessages.length === 0 && (
<p>
  {t("nxtGuide.empty.title")}<br/>
  • {t("nxtGuide.empty.q1")}<br/>
  • {t("nxtGuide.empty.q2")}<br/>
  • {t("nxtGuide.empty.q3")}<br/>
</p>
              )}
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${
                      m.role === "user"
                        ? "bg-[var(--color-teal-deep)] text-white"
                        : "bg-white text-[var(--color-navy)] border border-[var(--color-border)]"
                    } text-[11px] whitespace-pre-wrap`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <p className="text-[11px] text-[var(--color-muted)]">
{t("nxtGuide.typing")}
                </p>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="border-t border-[var(--color-border-light)] p-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
placeholder={t("nxtGuide.placeholders.ask")}
                className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-warm-cream)]/85 px-3 py-1.5 text-[11px] text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)] focus:border-[var(--color-teal)]"
              />
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="inline-flex items-center rounded-full bg-[var(--color-teal-deep)] px-3 py-2 text-[11px] font-semibold text-white shadow-md shadow-[var(--shadow-modal)] hover:bg-[var(--color-teal)] transition"
          >
{t("nxtGuide.floating.needHelpOnThisStep")}
          </button>
        )}
      </div>
      {requiredFieldsModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="intake-required-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRequiredFieldsModalOpen(false);
          }}
        >
          <div className="bg-white border border-[var(--color-border)] rounded-xl max-w-md w-full p-5 shadow-xl space-y-4">
            <h3 id="intake-required-modal-title" className="text-sm font-semibold text-[var(--color-navy)]">
              {t("intake.requiredBeforeContinue.modalTitle")}
            </h3>
            {missingKeysForCurrentStep.length > 0 ? (
              <ul className="text-xs text-[var(--color-slate)] space-y-2 list-disc list-inside">
                {missingKeysForCurrentStep.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--color-muted)]">{t("intake.requiredBeforeContinue.close")}</p>
            )}
            <div className="flex flex-col gap-2 pt-1">
              {missingKeysForCurrentStep.includes(lossCategoryMissingKey) && (
                <button
                  type="button"
                  onClick={() => {
                    setLossesNoneAck(true);
                    setRequiredFieldsModalOpen(false);
                  }}
                  className="text-left text-xs rounded-lg border border-[var(--color-border)] px-3 py-2 text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)] transition"
                >
                  {t("intake.requiredBeforeContinue.ackLossesNone")}
                </button>
              )}
              {missingKeysForCurrentStep.includes(employmentMissingKey) && (
                <button
                  type="button"
                  onClick={() => {
                    setEmploymentNoEmployerAck(true);
                    setRequiredFieldsModalOpen(false);
                  }}
                  className="text-left text-xs rounded-lg border border-[var(--color-border)] px-3 py-2 text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)] transition"
                >
                  {t("intake.requiredBeforeContinue.ackEmploymentNoEmployer")}
                </button>
              )}
              {missingKeysForCurrentStep.includes(funeralMissingKey) && (
                <button
                  type="button"
                  onClick={() => {
                    setFuneralIncompleteAck(true);
                    setRequiredFieldsModalOpen(false);
                  }}
                  className="text-left text-xs rounded-lg border border-[var(--color-border)] px-3 py-2 text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)] transition"
                >
                  {t("intake.requiredBeforeContinue.ackFuneralContinue")}
                </button>
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-[var(--color-border-light)]">
              <button
                type="button"
                onClick={() => setRequiredFieldsModalOpen(false)}
                className="text-xs rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 font-medium text-white hover:bg-[var(--color-teal)] transition"
              >
                {t("intake.requiredBeforeContinue.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {saveToast && (
        <div
          className="fixed left-1/2 z-50 max-w-[min(90vw,24rem)] -translate-x-1/2 rounded-full border border-[var(--color-border)] bg-[var(--color-warm-cream)]/95 px-4 py-2 text-center text-xs text-[var(--color-navy)] shadow-lg"
          style={{ bottom: "max(8.5rem, calc(7.5rem + env(safe-area-inset-bottom, 0px)))" }}
        >
          {saveToast}
        </div>
      )}

      <GroundingPauseBanner enabled={step === "victim" || step === "crime"} />
    </main>
  );
}

function StepBadge({
  label,
  active,
  complete,
  reviewed,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  /** Required fields for this section are satisfied (amber highlight). */
  complete?: boolean;
  /** User completed this step in “Review application” walkthrough (green). */
  reviewed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const baseClasses =
    "px-2 py-1 rounded-full border text-[11px] transition";
  let stateClasses: string;
  if (disabled) {
    stateClasses =
      "border-[var(--color-border-light)] bg-white text-[var(--color-muted)] cursor-not-allowed opacity-60";
  } else if (active) {
    stateClasses =
      "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)] cursor-pointer ring-1 ring-[var(--color-teal)]/40";
  } else if (reviewed) {
    stateClasses =
      "border-emerald-500/80 bg-emerald-500/15 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20 cursor-pointer";
  } else if (complete) {
    stateClasses =
      "border-amber-500/70 bg-amber-500/15 text-amber-100 hover:border-amber-400 hover:bg-amber-500/20 cursor-pointer";
  } else {
    stateClasses =
      "border-[var(--color-border)] bg-white text-[var(--color-muted)] hover:border-[var(--color-teal)] hover:text-[var(--color-charcoal)] cursor-pointer";
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`${baseClasses} ${stateClasses}`}
    >
      {label}
    </button>
  );
}

/* --- Victim / Applicant / Crime / Losses (unchanged from prior version) --- */

function VictimForm({
  victim,
  contact,
  onChange,
  onContactChange,
  stateCode,
  isReadOnly,
}: {
  victim: VictimInfo;
  contact?: AdvocateContact;
  onChange: (patch: Partial<VictimInfo>) => void;
  onContactChange?: (patch: Partial<AdvocateContact>) => void;
  stateCode: "IL" | "IN";
  isReadOnly: boolean;
}) {
const { t } = useI18n();
const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";
const isIN = stateCode === "IN";

  const disabilityTypes = ["physical", "mental", "developmental", "other"] as const;

  return (
    <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">
        {t("forms.victim.title")}
      </h2>

      <p className="text-xs text-[var(--color-slate)]">
        {t("forms.victim.description")}
      </p>

      {isIN && onContactChange && (
        <div className="space-y-2 text-xs pb-3 border-b border-[var(--color-border-light)]">
          <p className="text-[var(--color-charcoal)]">{t("forms.int.whoIsSubmitting")}</p>
          <div className="flex flex-wrap gap-2">
            {(["victim", "claimant", "advocate"] as const).map((v) => (
              <button
                key={v}
                type="button"
                disabled={isReadOnly}
                onClick={() => !isReadOnly && onContactChange({ whoIsSubmitting: v })}
                className={`px-3 py-1.5 rounded-full border text-[11px] ${disBtn} ${
                  contact?.whoIsSubmitting === v
                    ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                    : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                }`}
              >
                {t(`forms.int.whoOptions.${v}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("fields.firstName.required")}
          value={victim.firstName}
          onChange={(v) => onChange({ firstName: v })}
          disabled={isReadOnly}
        />
        <Field
          label={t("fields.lastName.required")}
          value={victim.lastName}
          onChange={(v) => onChange({ lastName: v })}
          disabled={isReadOnly}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("fields.dateOfBirth.required")}
          type="date"
          value={victim.dateOfBirth}
          onChange={(v) => onChange({ dateOfBirth: v })}
          disabled={isReadOnly}
        />
        {isIN && (
          <Field
            label={t("forms.int.last4SSN")}
            placeholder="####"
            value={victim.last4SSN ?? ""}
            onChange={(v) => onChange({ last4SSN: v || undefined })}
            disabled={isReadOnly}
          />
        )}
        <Field
          label={t("fields.cellPhone.label")}
          placeholder={t("fields.cellPhone.placeholder")}
          value={victim.cellPhone ?? ""}
          onChange={(v) => onChange({ cellPhone: v })}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-3">
        <Field
          label={t("fields.streetAddress.required")}
          value={victim.streetAddress}
          onChange={(v) => onChange({ streetAddress: v })}
          disabled={isReadOnly}
        />
        <Field
          label={t("fields.apt.label")}
          value={victim.apt ?? ""}
          onChange={(v) => onChange({ apt: v })}
          disabled={isReadOnly}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label={t("fields.city.required")}
            value={victim.city}
            onChange={(v) => onChange({ city: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("fields.state.required")}
            value={victim.state}
            onChange={(v) => onChange({ state: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("fields.zip.required")}
            value={victim.zip}
            onChange={(v) => onChange({ zip: v })}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("fields.email.label")}
          type="email"
          value={victim.email ?? ""}
          onChange={(v) => onChange({ email: v })}
          disabled={isReadOnly}
        />
        <Field
          label={t("fields.alternatePhone.label")}
          value={victim.alternatePhone ?? ""}
          onChange={(v) => onChange({ alternatePhone: v })}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-3 pt-3 border-t border-[var(--color-border-light)]">
        <p className="text-[11px] text-[var(--color-muted)]">
          {t("forms.victim.civilRightsNote")}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label={t("fields.genderIdentity.optional")}
            value={victim.genderIdentity ?? ""}
            onChange={(v) => onChange({ genderIdentity: v })}
            disabled={isReadOnly}
            placeholder={t("fields.genderIdentity.placeholder")}
          />
          <Field
            label={t("fields.race.optional")}
            value={victim.race ?? ""}
            onChange={(v) => onChange({ race: v })}
            disabled={isReadOnly}
            placeholder={t("fields.race.placeholder")}
          />
          <Field
            label={t("fields.ethnicity.optional")}
            value={victim.ethnicity ?? ""}
            onChange={(v) => onChange({ ethnicity: v })}
            disabled={isReadOnly}
            placeholder={t("fields.ethnicity.placeholder")}
          />
        </div>

        <div className="space-y-2 text-xs">
          <p className="text-[var(--color-charcoal)]">{t("fields.hasDisability.question")}</p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => !isReadOnly && onChange({ hasDisability: true })}
              className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                victim.hasDisability
                  ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
              }`}
            >
              {t("common.yes")}
            </button>

            <button
              type="button"
              disabled={isReadOnly}
              onClick={() =>
                !isReadOnly && onChange({ hasDisability: false, disabilityType: null })
              }
              className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                victim.hasDisability === false
                  ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
              }`}
            >
              {t("common.no")}
            </button>
          </div>

          {victim.hasDisability && (
            <div className="grid gap-2 sm:grid-cols-4 mt-2">
              {disabilityTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => !isReadOnly && onChange({ disabilityType: type })}
                  className={`px-2 py-1 rounded-full border text-[11px] ${disBtn} ${
                    victim.disabilityType === type
                      ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                      : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                  }`}
                >
                  {t(`fields.disabilityType.${type}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ApplicantForm({
  applicant,
  onChange,
  stateCode,
  isReadOnly,
}: {
  applicant: ApplicantInfo;
  onChange: (patch: Partial<ApplicantInfo>) => void;
  stateCode?: "IL" | "IN";
  isReadOnly: boolean;
}) {
  const { t } = useI18n();
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";
  const isIN = stateCode === "IN";

  return (
    <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">
        {t("forms.applicant.title")}
      </h2>

      <p className="text-xs text-[var(--color-slate)]">{t("forms.applicant.description")}</p>

      <div className="space-y-2 text-xs">
        <p className="text-[var(--color-charcoal)]">
          {t("forms.applicant.isVictimAlsoApplicantLabel")}
        </p>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            className="h-3 w-3"
            checked={applicant.isSameAsVictim}
            disabled={isReadOnly}
            onChange={() => !isReadOnly && onChange({ isSameAsVictim: true })}
          />
          <span>{t("forms.applicant.options.victim")}</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            className="h-3 w-3"
            checked={!applicant.isSameAsVictim}
            disabled={isReadOnly}
            onChange={() => !isReadOnly && onChange({ isSameAsVictim: false })}
          />
          <span>{t("forms.applicant.options.proxy")}</span>
        </label>

        {applicant.isSameAsVictim && (
          <p className="text-[11px] text-[var(--color-muted)]">
            {t("forms.applicant.sameAsVictimNote")}
          </p>
        )}
      </div>

      {!applicant.isSameAsVictim && (
        <div className="space-y-4 pt-3 border-t border-[var(--color-border-light)]">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t("fields.firstName.required")}
              value={applicant.firstName ?? ""}
              onChange={(v) => onChange({ firstName: v })}
              disabled={isReadOnly}
            />
            <Field
              label={t("fields.lastName.required")}
              value={applicant.lastName ?? ""}
              onChange={(v) => onChange({ lastName: v })}
              disabled={isReadOnly}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t("fields.dateOfBirth.required")}
              type="date"
              value={applicant.dateOfBirth ?? ""}
              onChange={(v) => onChange({ dateOfBirth: v })}
              disabled={isReadOnly}
            />
            {isIN && (
              <Field
                label={t("forms.int.last4SSN")}
                placeholder="####"
                value={applicant.last4SSN ?? ""}
                onChange={(v) => onChange({ last4SSN: v || undefined })}
                disabled={isReadOnly}
              />
            )}
            <Field
              label={t("forms.labels.relationship")}
              placeholder={t("forms.applicant.relationshipPlaceholder")}
              value={applicant.relationshipToVictim ?? ""}
              onChange={(v) => onChange({ relationshipToVictim: v })}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-3">
            <Field
              label={t("fields.streetAddress.required")}
              value={applicant.streetAddress ?? ""}
              onChange={(v) => onChange({ streetAddress: v })}
              disabled={isReadOnly}
            />
            <Field
              label={t("fields.apt.label")}
              value={applicant.apt ?? ""}
              onChange={(v) => onChange({ apt: v })}
              disabled={isReadOnly}
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label={t("fields.city.required")}
                value={applicant.city ?? ""}
                onChange={(v) => onChange({ city: v })}
                disabled={isReadOnly}
              />
              <Field
                label={t("fields.state.required")}
                value={applicant.state ?? ""}
                onChange={(v) => onChange({ state: v })}
                disabled={isReadOnly}
              />
              <Field
                label={t("fields.zip.required")}
                value={applicant.zip ?? ""}
                onChange={(v) => onChange({ zip: v })}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t("fields.email.label")}
              type="email"
              value={applicant.email ?? ""}
              onChange={(v) => onChange({ email: v })}
              disabled={isReadOnly}
            />
            <Field
              label={t("fields.cellPhone.label")}
              placeholder={t("fields.cellPhone.placeholder")}
              value={applicant.cellPhone ?? ""}
              onChange={(v) => onChange({ cellPhone: v })}
              disabled={isReadOnly}
            />
          </div>

          {/* NEW: Seeking own expenses question */}
          <div className="space-y-2 pt-3 border-t border-[var(--color-border-light)] text-xs">
            <p className="text-[var(--color-charcoal)]">
              {t("forms.applicant.seekingOwnExpenses.question")}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() =>
                  !isReadOnly && onChange({ seekingOwnExpenses: true })
                }
                className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                  applicant.seekingOwnExpenses === true
                    ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                    : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                }`}
              >
                {t("common.yes")}
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() =>
                  !isReadOnly && onChange({ seekingOwnExpenses: false })
                }
                className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                  applicant.seekingOwnExpenses === false
                    ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                    : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                }`}
              >
                {t("common.no")}
              </button>
            </div>
            {applicant.seekingOwnExpenses === false && (
              <Field
                label={t("forms.applicant.descriptionOfExpensesSought.label")}
                placeholder={t("forms.applicant.descriptionOfExpensesSought.placeholder")}
                value={applicant.descriptionOfExpensesSought ?? ""}
                onChange={(v) => onChange({ descriptionOfExpensesSought: v })}
                disabled={isReadOnly}
              />
            )}
          </div>

          <div className="space-y-2 pt-3 border-t border-[var(--color-border-light)] text-xs">
            <p className="text-[var(--color-charcoal)]">
              {t("forms.applicant.legalGuardianship.question")}
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() =>
                  !isReadOnly && onChange({ hasLegalGuardianship: true })
                }
                className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                  applicant.hasLegalGuardianship
                    ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                    : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                }`}
              >
                {t("common.yes")}
              </button>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={() =>
                  !isReadOnly && onChange({ hasLegalGuardianship: false })
                }
                className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                  applicant.hasLegalGuardianship === false
                    ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                    : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                }`}
              >
                {t("forms.applicant.legalGuardianship.noNotSure")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ContactForm({
  contact,
  onChange,
  stateCode: _stateCode,
  isReadOnly,
}: {
  contact: AdvocateContact;
  onChange: (patch: Partial<AdvocateContact>) => void;
  stateCode?: "IL" | "IN";
  isReadOnly: boolean;
}) {
  const { t } = useI18n();
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

  return (
    <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4 mt-4">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">
        {t("forms.contact.title")}
      </h2>

      <p className="text-xs text-[var(--color-slate)]">{t("forms.contact.description")}</p>

      {/* Language preference */}
      <div className="space-y-2 text-xs">
        <p className="text-[var(--color-charcoal)]">
          {t("forms.contact.prefersEnglishQuestion")}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ prefersEnglish: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              contact.prefersEnglish === true
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ prefersEnglish: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              contact.prefersEnglish === false
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.no")}
          </button>
        </div>
        {contact.prefersEnglish === false && (
          <Field
            label={t("forms.contact.preferredLanguageLabel")}
            placeholder={t("forms.contact.preferredLanguagePlaceholder")}
            value={contact.preferredLanguage ?? ""}
            onChange={(v) => onChange({ preferredLanguage: v })}
            disabled={isReadOnly}
          />
        )}
      </div>

      {/* Working with advocate */}
      <div className="space-y-2 text-xs pt-3 border-t border-[var(--color-border-light)]">
        <p className="text-[var(--color-charcoal)]">
          {t("forms.contact.workingWithAdvocateQuestion")}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() =>
              !isReadOnly && onChange({ workingWithAdvocate: true })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              contact.workingWithAdvocate === true
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() =>
              !isReadOnly && onChange({ workingWithAdvocate: false })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              contact.workingWithAdvocate === false
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.no")}
          </button>
        </div>

        {contact.workingWithAdvocate && (
          <div className="space-y-3 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t("forms.contact.advocateNameLabel")}
                value={contact.advocateName ?? ""}
                onChange={(v) => onChange({ advocateName: v })}
                disabled={isReadOnly}
              />
              <Field
                label={t("forms.contact.advocatePhoneLabel")}
                placeholder={t("fields.cellPhone.placeholder")}
                value={contact.advocatePhone ?? ""}
                onChange={(v) => onChange({ advocatePhone: v })}
                disabled={isReadOnly}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t("forms.contact.advocateOrganizationLabel")}
                value={contact.advocateOrganization ?? ""}
                onChange={(v) => onChange({ advocateOrganization: v })}
                disabled={isReadOnly}
              />
              <Field
                label={t("forms.contact.advocateEmailLabel")}
                type="email"
                value={contact.advocateEmail ?? ""}
                onChange={(v) => onChange({ advocateEmail: v })}
                disabled={isReadOnly}
              />
            </div>

            {/* Consent to talk to advocate */}
            <div className="space-y-2 pt-2">
              <p className="text-[var(--color-charcoal)]">
                {t("forms.contact.consentToTalkToAdvocateQuestion")}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() =>
                    !isReadOnly && onChange({ consentToTalkToAdvocate: true })
                  }
                  className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                    contact.consentToTalkToAdvocate === true
                      ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                      : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                  }`}
                >
                  {t("common.yes")}
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() =>
                    !isReadOnly && onChange({ consentToTalkToAdvocate: false })
                  }
                  className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                    contact.consentToTalkToAdvocate === false
                      ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                      : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                  }`}
                >
                  {t("common.no")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alternate contact */}
      <div className="space-y-2 text-xs pt-3 border-t border-[var(--color-border-light)]">
        <p className="text-[var(--color-charcoal)]">
          {t("forms.contact.alternateContactQuestion")}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() =>
              !isReadOnly &&
              onChange({
                alternateContactName: contact.alternateContactName ? contact.alternateContactName : "",
              })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              contact.alternateContactName
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() =>
              !isReadOnly &&
              onChange({
                alternateContactName: undefined,
                alternateContactPhone: undefined,
                alternateContactRelationship: undefined,
              })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              !contact.alternateContactName
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.no")}
          </button>
        </div>

        {contact.alternateContactName && (
          <div className="space-y-3 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t("forms.contact.alternateContactNameLabel")}
                value={contact.alternateContactName ?? ""}
                onChange={(v) => onChange({ alternateContactName: v })}
                disabled={isReadOnly}
              />
              <Field
                label={t("forms.contact.alternateContactPhoneLabel")}
                placeholder={t("fields.cellPhone.placeholder")}
                value={contact.alternateContactPhone ?? ""}
                onChange={(v) => onChange({ alternateContactPhone: v })}
                disabled={isReadOnly}
              />
            </div>
            <Field
              label={t("forms.contact.alternateContactRelationshipLabel")}
              placeholder={t("forms.applicant.relationshipPlaceholder")}
              value={contact.alternateContactRelationship ?? ""}
              onChange={(v) => onChange({ alternateContactRelationship: v })}
              disabled={isReadOnly}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function CrimeForm({
  crime,
  onChange,
  stateCode,
  isReadOnly,
  fieldState = {},
  caseId = null,
  onSkip,
  onDefer,
}: {
  crime: CrimeInfo;
  onChange: (patch: Partial<CrimeInfo>) => void;
  stateCode?: "IL" | "IN";
  isReadOnly: boolean;
  fieldState?: FieldStateMap;
  caseId?: string | null;
  onSkip?: (fieldKey: string) => void;
  onDefer?: (fieldKey: string) => void;
}) {
  const { t } = useI18n();
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";
  const isIN = stateCode === "IN";

  return (
    <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">
        {t("forms.crime.title")}
      </h2>

      <p className="text-xs text-[var(--color-slate)]">{t("forms.crime.description")}</p>

      {isIN && (
        <>
          <div className="space-y-2 text-xs">
            <p className="text-[var(--color-charcoal)]">{t("forms.int.autoAccident")}</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => !isReadOnly && onChange({ isAutomobileAccident: true })}
                className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                  crime.isAutomobileAccident === true ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]" : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                }`}
              >
                {t("common.yes")}
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => !isReadOnly && onChange({ isAutomobileAccident: false })}
                className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                  crime.isAutomobileAccident === false ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]" : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                }`}
              >
                {t("common.no")}
              </button>
            </div>
            {crime.isAutomobileAccident && (
              <Field
                label={t("forms.int.autoInsuranceName")}
                value={crime.suspectAutoInsurance ?? ""}
                onChange={(v) => onChange({ suspectAutoInsurance: v })}
                disabled={isReadOnly}
              />
            )}
          </div>
          <div className="space-y-2 text-xs">
            <p className="text-[var(--color-charcoal)]">{t("forms.int.physicalInjuries")}</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => !isReadOnly && onChange({ victimHasPhysicalInjuries: true })}
                className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                  crime.victimHasPhysicalInjuries === true ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]" : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                }`}
              >
                {t("common.yes")}
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => !isReadOnly && onChange({ victimHasPhysicalInjuries: false })}
                className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                  crime.victimHasPhysicalInjuries === false ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]" : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                }`}
              >
                {t("common.no")}
              </button>
            </div>
            {crime.victimHasPhysicalInjuries && (
              <Field
                label={t("forms.int.medicalFacilityName")}
                value={crime.medicalFacilityForTreatment ?? ""}
                onChange={(v) => onChange({ medicalFacilityForTreatment: v })}
                disabled={isReadOnly}
              />
            )}
          </div>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("forms.crime.dateOfCrimeLabel")}
          type="date"
          value={crime.dateOfCrime}
          onChange={(v) => onChange({ dateOfCrime: v })}
          disabled={isReadOnly}
        />
        {isIN && (
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--color-muted)] block">{t("forms.int.timeOfCrime")}</label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => !isReadOnly && onChange({ timeOfCrimeAmPm: "AM" })}
                className={`px-3 py-1.5 rounded border text-xs ${disBtn} ${
                  crime.timeOfCrimeAmPm === "AM" ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80" : "border-[var(--color-border)]"
                }`}
              >
                AM
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => !isReadOnly && onChange({ timeOfCrimeAmPm: "PM" })}
                className={`px-3 py-1.5 rounded border text-xs ${disBtn} ${
                  crime.timeOfCrimeAmPm === "PM" ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80" : "border-[var(--color-border)]"
                }`}
              >
                PM
              </button>
            </div>
          </div>
        )}
        <Field
          label={t("forms.crime.dateReportedLabel")}
          type="date"
          value={crime.dateReported ?? ""}
          onChange={(v) => onChange({ dateReported: v })}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-3">
        <Field
          label={t("forms.crime.crimeAddressLabel")}
          value={crime.crimeAddress}
          onChange={(v) => onChange({ crimeAddress: v })}
          disabled={isReadOnly}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label={t("forms.crime.crimeCityLabel")}
            value={crime.crimeCity}
            onChange={(v) => onChange({ crimeCity: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.crime.crimeCountyLabel")}
            value={crime.crimeCounty ?? ""}
            onChange={(v) => onChange({ crimeCounty: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.crime.reportingAgencyLabel")}
            placeholder={t("forms.crime.reportingAgencyPlaceholder")}
            value={crime.reportingAgency}
            onChange={(v) => onChange({ reportingAgency: v })}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <Field
        label={t("forms.crime.policeReportNumberHelp")}
        value={crime.policeReportNumber ?? ""}
        onChange={(v) => onChange({ policeReportNumber: v })}
        disabled={isReadOnly}
      />

      {isIN && (
        <Field
          label={t("forms.int.crimeType")}
          value={crime.crimeType ?? ""}
          onChange={(v) => onChange({ crimeType: v })}
          disabled={isReadOnly}
        />
      )}

      {/* Phase 8: high-sensitivity block – safe-mode copy + skip/defer */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-light-sand)]/70 px-3 py-2 text-xs text-[var(--color-slate)]">
        <p>{t("intake.safeMode.takeYourTime")}</p>
        <p className="mt-1.5">
          {t("intake.explainThisNeedHelp")}{" "}
          <ExplainThisButton
            sourceText={t("forms.crime.crimeDescriptionLabel")}
            contextType="intake_question"
            workflowKey="compensation_intake"
            fieldKey="crime.crimeDescription"
            stateCode={stateCode ?? undefined}
            label={t("intake.explainThis")}
            variant="link"
          />
        </p>
      </div>

      <div className="space-y-2">
        <Field
          label={t("forms.crime.crimeDescriptionLabel")}
          placeholder={t("forms.crime.crimeDescriptionPlaceholder")}
          value={crime.crimeDescription ?? ""}
          onChange={(v) => onChange({ crimeDescription: v })}
          disabled={isReadOnly}
        />
        {canSkip("crime.crimeDescription") && !isReadOnly && onSkip && onDefer && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSkip("crime.crimeDescription")}
              className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-charcoal)] underline underline-offset-1"
            >
              {t("intake.skipForNow")}
            </button>
            <button
              type="button"
              onClick={() => onDefer("crime.crimeDescription")}
              className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-charcoal)] underline underline-offset-1"
            >
              {t("intake.answerLater")}
            </button>
          </div>
        )}
        {fieldState["crime.crimeDescription"]?.status === "skipped" && (
          <p className="text-[11px] text-amber-200/80">{t("intake.review.skipped")}</p>
        )}
        {fieldState["crime.crimeDescription"]?.status === "deferred" && (
          <p className="text-[11px] text-amber-200/80">{t("intake.review.deferred")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Field
          label={t("forms.crime.injuryDescriptionLabel")}
          placeholder={t("forms.crime.injuryDescriptionPlaceholder")}
          value={crime.injuryDescription ?? ""}
          onChange={(v) => onChange({ injuryDescription: v })}
          disabled={isReadOnly}
        />
        {canSkip("crime.injuryDescription") && !isReadOnly && onSkip && onDefer && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSkip("crime.injuryDescription")}
              className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-charcoal)] underline underline-offset-1"
            >
              {t("intake.skipForNow")}
            </button>
            <button
              type="button"
              onClick={() => onDefer("crime.injuryDescription")}
              className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-charcoal)] underline underline-offset-1"
            >
              {t("intake.answerLater")}
            </button>
          </div>
        )}
        {fieldState["crime.injuryDescription"]?.status === "skipped" && (
          <p className="text-[11px] text-amber-200/80">{t("intake.review.skipped")}</p>
        )}
        {fieldState["crime.injuryDescription"]?.status === "deferred" && (
          <p className="text-[11px] text-amber-200/80">{t("intake.review.deferred")}</p>
        )}
        <p className="text-[11px] text-[var(--color-muted)]">
          {t("intake.explainThisNeedHelp")}{" "}
          <ExplainThisButton
            sourceText={t("forms.crime.injuryDescriptionLabel")}
            contextType="intake_question"
            workflowKey="compensation_intake"
            fieldKey="crime.injuryDescription"
            stateCode={stateCode ?? undefined}
            label={t("intake.explainThis")}
            variant="link"
          />
        </p>
      </div>

      <div className="space-y-2 text-xs">
        <p className="text-[var(--color-charcoal)]">{t("forms.crime.offenderKnownQuestion")}</p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ offenderKnown: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              crime.offenderKnown
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ offenderKnown: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              crime.offenderKnown === false
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("forms.crime.noNotSure")}
          </button>
        </div>
      </div>

      {crime.offenderKnown && (
        <div className="space-y-3">
          <Field
            label={t("forms.crime.offenderNamesLabel")}
            value={crime.offenderNames ?? ""}
            onChange={(v) => onChange({ offenderNames: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.crime.offenderRelationshipLabel")}
            placeholder={t("forms.crime.offenderRelationshipPlaceholder")}
            value={crime.offenderRelationship ?? ""}
            onChange={(v) => onChange({ offenderRelationship: v })}
            disabled={isReadOnly}
          />
        </div>
      )}

      <div className="space-y-2 text-xs pt-2 border-t border-[var(--color-border-light)]">
        <p className="text-[var(--color-charcoal)]">
          {t("forms.crime.sexualAssaultKitQuestion")}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() =>
              !isReadOnly && onChange({ sexualAssaultKitPerformed: true })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              crime.sexualAssaultKitPerformed
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() =>
              !isReadOnly && onChange({ sexualAssaultKitPerformed: false })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              crime.sexualAssaultKitPerformed === false
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("forms.crime.noNotSure")}
          </button>
        </div>
      </div>

      <InlineDocumentUploader
        contextLabel={t("forms.crime.uploaderContextLabel")}
        defaultDocType="police_report"
        disabled={isReadOnly}
      />
    </section>
  );
}

function CourtForm({
  court,
  onChange,
  stateCode,
  isReadOnly,
}: {
  court: CourtInfo;
  onChange: (patch: Partial<CourtInfo>) => void;
  stateCode?: "IL" | "IN";
  isReadOnly: boolean;
}) {
  const { t } = useI18n();
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";
  const isIN = stateCode === "IN";

  return (
    <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4 mt-4">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">
        {t("forms.court.title")}
      </h2>

      <p className="text-xs text-[var(--color-slate)]">
        {t("forms.court.description")}
      </p>

      {/* Arrested */}
      <div className="space-y-2 text-xs">
        <p className="text-[var(--color-charcoal)]">{t("forms.court.offenderArrestedQuestion")}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ offenderArrested: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.offenderArrested
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ offenderArrested: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.offenderArrested === false
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("forms.court.noNotSure")}
          </button>
        </div>
      </div>

      {/* Charged */}
      <div className="space-y-2 text-xs">
        <p className="text-[var(--color-charcoal)]">{t("forms.court.offenderChargedQuestion")}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ offenderCharged: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.offenderCharged
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ offenderCharged: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.offenderCharged === false
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("forms.court.noNotSure")}
          </button>
        </div>
      </div>

      {/* Testified */}
      <div className="space-y-2 text-xs">
        <p className="text-[var(--color-charcoal)]">{t("forms.court.applicantTestifiedQuestion")}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ applicantTestified: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.applicantTestified
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ applicantTestified: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.applicantTestified === false
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("forms.court.noNotSure")}
          </button>
        </div>
      </div>

      {isIN && (
        <>
          <div className="space-y-2 text-xs">
            <p className="text-[var(--color-charcoal)]">{t("forms.int.willingToAssistProsecution")}</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => !isReadOnly && onChange({ willingToAssistProsecution: true })}
                className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                  court.willingToAssistProsecution === true ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]" : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                }`}
              >
                {t("common.yes")}
              </button>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => !isReadOnly && onChange({ willingToAssistProsecution: false })}
                className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                  court.willingToAssistProsecution === false ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]" : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                }`}
              >
                {t("common.no")}
              </button>
            </div>
            {court.willingToAssistProsecution === false && (
              <Field
                label={t("forms.int.notWillingExplain")}
                value={court.notWillingProsecutionExplain ?? ""}
                onChange={(v) => onChange({ notWillingProsecutionExplain: v })}
                disabled={isReadOnly}
              />
            )}
          </div>
          <Field
            label={t("forms.int.causeNumber")}
            value={court.causeNumber ?? ""}
            onChange={(v) => onChange({ causeNumber: v })}
            disabled={isReadOnly}
          />
        </>
      )}

      <Field
        label={t("forms.court.criminalCaseNumberLabel")}
        value={court.criminalCaseNumber ?? ""}
        onChange={(v) => onChange({ criminalCaseNumber: v })}
        disabled={isReadOnly}
      />

      <Field
        label={t("forms.court.criminalCaseOutcomeLabel")}
        placeholder={t("forms.court.criminalCaseOutcomePlaceholder")}
        value={court.criminalCaseOutcome ?? ""}
        onChange={(v) => onChange({ criminalCaseOutcome: v })}
        disabled={isReadOnly}
      />

      {/* Restitution */}
      <div className="space-y-2 text-xs">
        <p className="text-[var(--color-charcoal)]">{t("forms.court.restitutionOrderedQuestion")}</p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ restitutionOrdered: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.restitutionOrdered
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ restitutionOrdered: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.restitutionOrdered === false
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("forms.court.noNotSure")}
          </button>
        </div>

        {court.restitutionOrdered && (
          <Field
            label={t("forms.court.restitutionAmountLabel")}
            placeholder={t("forms.court.restitutionAmountPlaceholder")}
            value={court.restitutionAmount?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                restitutionAmount: v
                  ? Number(v.replace(/[^0-9.]/g, ""))
                  : undefined,
              })
            }
            disabled={isReadOnly}
          />
        )}
      </div>

      {/* Human trafficking */}
      <div className="space-y-2 text-xs pt-3 border-t border-[var(--color-border-light)]">
        <p className="text-[var(--color-charcoal)]">{t("forms.court.humanTraffickingQuestion")}</p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() =>
              !isReadOnly && onChange({ humanTraffickingCaseFiled: true })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.humanTraffickingCaseFiled
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() =>
              !isReadOnly && onChange({ humanTraffickingCaseFiled: false })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.humanTraffickingCaseFiled === false
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("forms.court.noNotSure")}
          </button>
        </div>

        {court.humanTraffickingCaseFiled && (
          <>
            {/* NEW: Human trafficking testimony question */}
            <div className="space-y-2 pt-2">
              <p className="text-[var(--color-charcoal)]">
                {t("forms.court.humanTraffickingTestifiedQuestion")}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() =>
                    !isReadOnly && onChange({ humanTraffickingTestified: true })
                  }
                  className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                    court.humanTraffickingTestified === true
                      ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                      : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                  }`}
                >
                  {t("common.yes")}
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() =>
                    !isReadOnly && onChange({ humanTraffickingTestified: false })
                  }
                  className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                    court.humanTraffickingTestified === false
                      ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                      : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
                  }`}
                >
                  {t("forms.court.noNotSure")}
                </button>
              </div>
            </div>

            <Field
              label={t("forms.court.humanTraffickingCaseNumberLabel")}
              value={court.humanTraffickingCaseNumber ?? ""}
              onChange={(v) => onChange({ humanTraffickingCaseNumber: v })}
              disabled={isReadOnly}
            />
            <Field
              label={t("forms.court.humanTraffickingCaseOutcomeLabel")}
              value={court.humanTraffickingCaseOutcome ?? ""}
              onChange={(v) => onChange({ humanTraffickingCaseOutcome: v })}
              disabled={isReadOnly}
            />
          </>
        )}
      </div>
    </section>
  );
}

function LossesForm({
  losses,
  onChange,
  stateCode,
  isReadOnly,
}: {
  losses: LossesClaimed;
  onChange: (patch: Partial<LossesClaimed>) => void;
  stateCode?: "IL" | "IN";
  isReadOnly: boolean;
}) {
  const { t } = useI18n();
  const isIN = stateCode === "IN";

  const toggle = (key: keyof LossesClaimed) => {
    if (isReadOnly) return;
    onChange({ [key]: !losses[key] } as Partial<LossesClaimed>);
  };

  // Indiana simplified 5-category view
  if (isIN) {
    return (
      <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-navy)]">
          {t("forms.int.compensationRequesting")}
        </h2>
        <p className="text-xs text-[var(--color-slate)]">
          {t("forms.lossesExtended.description")}
        </p>
        <div className="space-y-3 text-xs">
          <Checkbox
            label={t("forms.int.medicalDentalCounseling")}
            checked={losses.medicalHospital || losses.dental || losses.counseling}
            onChange={() => {
              if (isReadOnly) return;
              const v = !(losses.medicalHospital || losses.dental || losses.counseling);
              onChange({ medicalHospital: v, dental: v, counseling: v });
            }}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.int.lossOfIncome")}
            checked={losses.lossOfEarnings}
            onChange={() => toggle("lossOfEarnings")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.int.funeralBurial")}
            checked={losses.funeralBurial}
            onChange={() => toggle("funeralBurial")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.int.lossOfSupport")}
            checked={losses.lossOfSupport}
            onChange={() => toggle("lossOfSupport")}
            disabled={isReadOnly}
          />
          <div>
            <Checkbox
              label={t("forms.int.other")}
              checked={!!losses.otherExpenses}
              onChange={() => {
                if (isReadOnly) return;
                onChange({ otherExpenses: !losses.otherExpenses });
              }}
              disabled={isReadOnly}
            />
            {losses.otherExpenses && (
              <div className="mt-2 ml-5">
                <Field
                  label={t("forms.int.otherDescribe")}
                  value={losses.otherExpensesDescription ?? ""}
                  onChange={(v) => onChange({ otherExpensesDescription: v })}
                  disabled={isReadOnly}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">
        {t("forms.lossesExtended.title")}
      </h2>

      <p className="text-xs text-[var(--color-slate)]">
        {t("forms.lossesExtended.description")}
      </p>

      <div className="grid gap-4 md:grid-cols-2 text-xs">
        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--color-navy)]">
            {t("forms.lossesExtended.groups.medical.title")}
          </h3>

          <Checkbox
            label={t("forms.lossesExtended.items.medicalHospital")}
            checked={losses.medicalHospital}
            onChange={() => toggle("medicalHospital")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.dental")}
            checked={losses.dental}
            onChange={() => toggle("dental")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.counseling")}
            checked={losses.counseling}
            onChange={() => toggle("counseling")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.transportation")}
            checked={losses.transportation}
            onChange={() => toggle("transportation")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.accessibilityCosts")}
            checked={losses.accessibilityCosts}
            onChange={() => toggle("accessibilityCosts")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.temporaryLodging")}
            checked={losses.temporaryLodging}
            onChange={() => toggle("temporaryLodging")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.relocationCosts")}
            checked={losses.relocationCosts}
            onChange={() => toggle("relocationCosts")}
            disabled={isReadOnly}
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--color-navy)]">
            {t("forms.lossesExtended.groups.work.title")}
          </h3>

          <Checkbox
            label={t("forms.lossesExtended.items.lossOfEarnings")}
            checked={losses.lossOfEarnings}
            onChange={() => toggle("lossOfEarnings")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.lossOfSupport")}
            checked={losses.lossOfSupport}
            onChange={() => toggle("lossOfSupport")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.lossOfFutureEarnings")}
            checked={losses.lossOfFutureEarnings}
            onChange={() => toggle("lossOfFutureEarnings")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.replacementServiceLoss")}
            checked={losses.replacementServiceLoss}
            onChange={() => toggle("replacementServiceLoss")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.tuition")}
            checked={losses.tuition}
            onChange={() => toggle("tuition")}
            disabled={isReadOnly}
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--color-navy)]">
            {t("forms.lossesExtended.groups.funeralProperty.title")}
          </h3>

          <Checkbox
            label={t("forms.lossesExtended.items.funeralBurial")}
            checked={losses.funeralBurial}
            onChange={() => toggle("funeralBurial")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.headstone")}
            checked={losses.headstone}
            onChange={() => toggle("headstone")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.crimeSceneCleanup")}
            checked={losses.crimeSceneCleanup}
            onChange={() => toggle("crimeSceneCleanup")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.towingStorage")}
            checked={losses.towingStorage}
            onChange={() => toggle("towingStorage")}
            disabled={isReadOnly}
          />

          <Checkbox
            label={t("forms.lossesExtended.items.securityRepairs")}
            checked={losses.doors || losses.locks || losses.windows}
            disabled={isReadOnly}
            onChange={() => {
              if (isReadOnly) return;
              onChange({
                doors: !losses.doors,
                locks: !losses.locks,
                windows: !losses.windows,
              });
            }}
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--color-navy)]">
            {t("forms.lossesExtended.groups.personalOther.title")}
          </h3>

          <Checkbox
            label={t("forms.lossesExtended.items.evidenceClothingBedding")}
            checked={losses.clothing || losses.bedding}
            disabled={isReadOnly}
            onChange={() => {
              if (isReadOnly) return;
              onChange({
                clothing: !losses.clothing,
                bedding: !losses.bedding,
              });
            }}
          />

          <Checkbox
            label={t("forms.lossesExtended.items.assistiveItems")}
            checked={
              losses.prostheticAppliances ||
              losses.eyeglassesContacts ||
              losses.hearingAids
            }
            disabled={isReadOnly}
            onChange={() => {
              if (isReadOnly) return;
              onChange({
                prostheticAppliances: !losses.prostheticAppliances,
                eyeglassesContacts: !losses.eyeglassesContacts,
                hearingAids: !losses.hearingAids,
              });
            }}
          />

          <Checkbox
            label={t("forms.lossesExtended.items.replacementCosts")}
            checked={losses.replacementCosts}
            onChange={() => toggle("replacementCosts")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.legalFees")}
            checked={losses.legalFees}
            onChange={() => toggle("legalFees")}
            disabled={isReadOnly}
          />
          <Checkbox
            label={t("forms.lossesExtended.items.tattooRemoval")}
            checked={losses.tattooRemoval}
            onChange={() => toggle("tattooRemoval")}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <p className="text-[11px] text-[var(--color-muted)]">
        {t("forms.lossesExtended.footerNote")}
      </p>
    </section>
  );
}

function MedicalForm({
  medical,
  onChange,
  isReadOnly,
}: {
  medical: MedicalInfo;
  onChange: (patch: Partial<MedicalInfo>) => void;
  isReadOnly: boolean;
}) {
  const { t } = useI18n();

  const disBtn = isReadOnly
    ? "opacity-60 cursor-not-allowed pointer-events-none"
    : "";

  const providersSafe = Array.isArray(medical.providers) ? medical.providers : [];
  const primary = providersSafe[0] ?? {
    providerName: "",
    city: "",
    phone: "",
    serviceDates: "",
    amountOfBill: undefined as number | undefined,
  };

  const updatePrimary = (
    patch: Partial<{
      providerName: string;
      city: string;
      phone: string;
      serviceDates: string;
      amountOfBill?: number;
    }>
  ) => {
    if (isReadOnly) return;

    const updated = { ...primary, ...patch };
    const providers = [...providersSafe];
    providers[0] = {
      providerName: updated.providerName,
      city: updated.city,
      phone: updated.phone,
      serviceDates: updated.serviceDates,
      amountOfBill: updated.amountOfBill,
    };

    onChange({ providers });
  };

  return (
    <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">
        {t("forms.medicalExtended.title")}
      </h2>

      <p className="text-xs text-[var(--color-slate)]">
        {t("forms.medicalExtended.description")}
      </p>

      <div className="space-y-3">
        <Field
          label={t("forms.medicalExtended.fields.providerNameLabel")}
          value={primary.providerName}
          onChange={(v) => updatePrimary({ providerName: v })}
          disabled={isReadOnly}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label={t("forms.medicalExtended.fields.cityLabel")}
            value={primary.city || ""}
            onChange={(v) => updatePrimary({ city: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.medicalExtended.fields.phoneLabel")}
            value={primary.phone || ""}
            onChange={(v) => updatePrimary({ phone: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.medicalExtended.fields.serviceDatesLabel")}
            value={primary.serviceDates || ""}
            onChange={(v) => updatePrimary({ serviceDates: v })}
            disabled={isReadOnly}
          />
        </div>

        <Field
          label={t("forms.medicalExtended.fields.amountLabel")}
          placeholder={t("forms.medicalExtended.fields.amountPlaceholder")}
          value={primary.amountOfBill?.toString() ?? ""}
          onChange={(v) =>
            updatePrimary({
              amountOfBill: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
            })
          }
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2 pt-3 border-t border-[var(--color-border-light)] text-xs">
        <p className="text-[var(--color-charcoal)]">
          {t("forms.medicalExtended.otherSources.question")}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ hasOtherSources: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              medical.hasOtherSources
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ hasOtherSources: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              medical.hasOtherSources === false
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("forms.medicalExtended.noNotSure")}
          </button>
        </div>

        {medical.hasOtherSources && (
          <Field
            label={t("forms.medicalExtended.otherSources.descriptionLabel")}
            value={medical.otherInsuranceDescription || ""}
            onChange={(v) =>
              !isReadOnly && onChange({ otherInsuranceDescription: v })
            }
            disabled={isReadOnly}
          />
        )}
      </div>

      <p className="text-[11px] text-[var(--color-muted)]">
        {t("forms.medicalExtended.footerNote")}
      </p>

      <InlineDocumentUploader
        contextLabel={t("forms.medicalExtended.uploaderContextLabel")}
        defaultDocType="medical_bill"
        disabled={isReadOnly}
      />
    </section>
  );
}

function EmploymentForm({
  employment,
  onChange,
  isReadOnly,
}: {
  employment: EmploymentInfo;
  onChange: (patch: Partial<EmploymentInfo>) => void;
  isReadOnly: boolean;
}) {
  const { t } = useI18n();

  const disBtn = isReadOnly
    ? "opacity-60 cursor-not-allowed pointer-events-none"
    : "";

  const historySafe = Array.isArray(employment.employmentHistory)
    ? employment.employmentHistory
    : [];

  const record = historySafe[0] ?? {
    employerName: "",
    employerAddress: "",
    employerPhone: "",
    netMonthlyWages: undefined as number | undefined,
  };

  const updateRecord = (
    patch: Partial<{
      employerName: string;
      employerAddress: string;
      employerPhone: string;
      netMonthlyWages?: number;
    }>
  ) => {
    if (isReadOnly) return;

    const updated = { ...record, ...patch };
    const history = [...historySafe];
    history[0] = {
      employerName: updated.employerName,
      employerAddress: updated.employerAddress,
      employerPhone: updated.employerPhone,
      netMonthlyWages: updated.netMonthlyWages,
    };

    onChange({ employmentHistory: history });
  };

  return (
    <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">
        {t("forms.employmentExtended.title")}
      </h2>

      <p className="text-xs text-[var(--color-slate)]">
        {t("forms.employmentExtended.description")}
      </p>

      <div className="space-y-3">
        <Field
          label={t("forms.employmentExtended.fields.employerNameLabel")}
          value={record.employerName}
          onChange={(v) => updateRecord({ employerName: v })}
          disabled={isReadOnly}
        />

        <Field
          label={t("forms.employmentExtended.fields.employerAddressLabel")}
          value={record.employerAddress ?? ""}
          onChange={(v) => updateRecord({ employerAddress: v })}
          disabled={isReadOnly}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={t("forms.employmentExtended.fields.employerPhoneLabel")}
            value={record.employerPhone ?? ""}
            onChange={(v) => updateRecord({ employerPhone: v })}
            disabled={isReadOnly}
          />

          <Field
            label={t("forms.employmentExtended.fields.netMonthlyWagesLabel")}
            placeholder={t("forms.employmentExtended.fields.netMonthlyWagesPlaceholder")}
            value={record.netMonthlyWages?.toString() ?? ""}
            onChange={(v) =>
              updateRecord({
                netMonthlyWages: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
              })
            }
            disabled={isReadOnly}
          />
        </div>

        <div className="space-y-2 pt-3 border-t border-[var(--color-border-light)] text-xs">
          <p className="text-[var(--color-charcoal)]">
            {t("forms.employmentExtended.benefits.question")}
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() =>
                !isReadOnly && onChange({ receivedSickOrVacationOrDisability: true })
              }
              className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                employment.receivedSickOrVacationOrDisability
                  ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
              }`}
            >
              {t("common.yes")}
            </button>

            <button
              type="button"
              disabled={isReadOnly}
              onClick={() =>
                !isReadOnly && onChange({ receivedSickOrVacationOrDisability: false })
              }
              className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                employment.receivedSickOrVacationOrDisability === false
                  ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
              }`}
            >
              {t("forms.employmentExtended.noNotSure")}
            </button>
          </div>

          {employment.receivedSickOrVacationOrDisability && (
            <>
              <Field
                label={t("forms.employmentExtended.benefits.notesLabel")}
                value={employment.benefitNotes || ""}
                onChange={(v) => !isReadOnly && onChange({ benefitNotes: v })}
                disabled={isReadOnly}
              />
              {/* NEW: Benefit breakdown fields */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <Field
                  label={t("forms.employmentExtended.benefits.sickPayLabel")}
                  placeholder="0"
                  value={employment.sickPayAmount?.toString() ?? ""}
                  onChange={(v) =>
                    onChange({
                      sickPayAmount: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
                    })
                  }
                  disabled={isReadOnly}
                />
                <Field
                  label={t("forms.employmentExtended.benefits.vacationPayLabel")}
                  placeholder="0"
                  value={employment.vacationPayAmount?.toString() ?? ""}
                  onChange={(v) =>
                    onChange({
                      vacationPayAmount: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
                    })
                  }
                  disabled={isReadOnly}
                />
                <Field
                  label={t("forms.employmentExtended.benefits.personalTimeLabel")}
                  placeholder="0"
                  value={employment.personalTimeAmount?.toString() ?? ""}
                  onChange={(v) =>
                    onChange({
                      personalTimeAmount: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
                    })
                  }
                  disabled={isReadOnly}
                />
                <Field
                  label={t("forms.employmentExtended.benefits.disabilityPayLabel")}
                  placeholder="0"
                  value={employment.disabilityPayAmount?.toString() ?? ""}
                  onChange={(v) =>
                    onChange({
                      disabilityPayAmount: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
                    })
                  }
                  disabled={isReadOnly}
                />
                <Field
                  label={t("forms.employmentExtended.benefits.otherBenefitLabel")}
                  placeholder="0"
                  value={employment.otherBenefitAmount?.toString() ?? ""}
                  onChange={(v) =>
                    onChange({
                      otherBenefitAmount: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
                    })
                  }
                  disabled={isReadOnly}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-[11px] text-[var(--color-muted)]">
        {t("forms.employmentExtended.footerNote")}
      </p>

      <InlineDocumentUploader
        contextLabel={t("forms.employmentExtended.uploaderContextLabel")}
        defaultDocType="wage_proof"
        disabled={isReadOnly}
      />
    </section>
  );
}

function FuneralForm({
  funeral,
  onChange,
  isReadOnly,
}: {
  funeral: FuneralInfo;
  onChange: (patch: Partial<FuneralInfo>) => void;
  isReadOnly: boolean;
}) {
  const { t } = useI18n();
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

  const primaryPayment = funeral.payments?.[0] ?? {
    payerName: "",
    relationshipToVictim: "",
    amountPaid: 0,
  };

  const updatePrimaryPayment = (
    patch: Partial<{
      payerName: string;
      relationshipToVictim: string;
      amountPaid: number;
    }>
  ) => {
    if (isReadOnly) return;

    const updated = { ...primaryPayment, ...patch };
    const payments = [...(funeral.payments ?? [])];
    payments[0] = {
      payerName: updated.payerName,
      relationshipToVictim: updated.relationshipToVictim,
      amountPaid: updated.amountPaid,
    };
    onChange({ payments });
  };

  const dep =
    funeral.dependents && funeral.dependents.length > 0
      ? funeral.dependents[0]
      : {
          name: "",
          relationshipToVictim: "",
          dateOfBirth: "",
          guardianNamePhone: "",
        };

  const updateDep = (patch: Partial<typeof dep>) => {
    if (isReadOnly) return;

    const updated = { ...dep, ...patch };
    const deps = [...(funeral.dependents ?? [])];
    deps[0] = updated;
    onChange({ dependents: deps });
  };

  return (
    <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">
        {t("forms.funeralExtended.title")}
      </h2>

      <p className="text-xs text-[var(--color-slate)]">
        {t("forms.funeralExtended.description")}
      </p>

      {/* Funeral home */}
      <div className="space-y-3">
        <Field
          label={t("forms.funeralExtended.funeralHome.nameLabel")}
          value={funeral.funeralHomeName ?? ""}
          onChange={(v) => onChange({ funeralHomeName: v })}
          disabled={isReadOnly}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={t("forms.funeralExtended.funeralHome.phoneLabel")}
            value={funeral.funeralHomePhone ?? ""}
            onChange={(v) => onChange({ funeralHomePhone: v })}
            disabled={isReadOnly}
          />

          <Field
            label={t("forms.funeralExtended.funeralHome.billTotalLabel")}
            placeholder={t("forms.funeralExtended.placeholders.moneyExample8000")}
            value={funeral.funeralBillTotal?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                funeralBillTotal: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
              })
            }
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Cemetery */}
      <div className="space-y-3 pt-3 border-t border-[var(--color-border-light)]">
        <h3 className="text-xs font-semibold text-[var(--color-navy)]">
          {t("forms.funeralExtended.cemetery.title")}
        </h3>

        <Field
          label={t("forms.funeralExtended.cemetery.nameLabel")}
          value={funeral.cemeteryName ?? ""}
          onChange={(v) => onChange({ cemeteryName: v })}
          disabled={isReadOnly}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={t("forms.funeralExtended.cemetery.phoneLabel")}
            value={funeral.cemeteryPhone ?? ""}
            onChange={(v) => onChange({ cemeteryPhone: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.funeralExtended.cemetery.billTotalLabel")}
            placeholder={t("forms.funeralExtended.placeholders.moneyExample2000")}
            value={funeral.cemeteryBillTotal?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                cemeteryBillTotal: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
              })
            }
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Who paid */}
      <div className="space-y-3 pt-3 border-t border-[var(--color-border-light)]">
        <h3 className="text-xs font-semibold text-[var(--color-navy)]">
          {t("forms.funeralExtended.payer.title")}
        </h3>

        <div className="space-y-3">
          <Field
            label={t("forms.funeralExtended.payer.nameLabel")}
            value={primaryPayment.payerName}
            onChange={(v) => updatePrimaryPayment({ payerName: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.funeralExtended.payer.relationshipLabel")}
            placeholder={t("forms.funeralExtended.payer.relationshipPlaceholder")}
            value={primaryPayment.relationshipToVictim ?? ""}
            onChange={(v) => updatePrimaryPayment({ relationshipToVictim: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.funeralExtended.payer.amountPaidLabel")}
            placeholder={t("forms.funeralExtended.placeholders.moneyExample2000")}
            value={
              primaryPayment.amountPaid != null
                ? primaryPayment.amountPaid.toString()
                : ""
            }
            onChange={(v) =>
              updatePrimaryPayment({
                amountPaid: v ? Number(v.replace(/[^0-9.]/g, "")) : 0,
              })
            }
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Chicago ESVF */}
      <div className="space-y-2 pt-3 border-t border-[var(--color-border-light)] text-xs">
        <p className="text-[var(--color-charcoal)]">{t("forms.funeralExtended.esvf.question")}</p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ receivedChicagoESVF: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              funeral.receivedChicagoESVF
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ receivedChicagoESVF: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              funeral.receivedChicagoESVF === false
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("forms.funeralExtended.noNotSure")}
          </button>
        </div>

        {funeral.receivedChicagoESVF && (
          <Field
            label={t("forms.funeralExtended.esvf.amountLabel")}
            placeholder={t("forms.funeralExtended.placeholders.moneyExample1500")}
            value={funeral.esvfAmount?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                esvfAmount: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
              })
            }
            disabled={isReadOnly}
          />
        )}
      </div>

      {/* Life insurance */}
      <div className="space-y-2 pt-3 border-t border-[var(--color-border-light)] text-xs">
        <p className="text-[var(--color-charcoal)]">
          {t("forms.funeralExtended.lifeInsurance.question")}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() =>
              !isReadOnly && onChange({ lifeInsurancePolicyExists: true })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              funeral.lifeInsurancePolicyExists
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("common.yes")}
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() =>
              !isReadOnly && onChange({ lifeInsurancePolicyExists: false })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              funeral.lifeInsurancePolicyExists === false
                ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
            }`}
          >
            {t("forms.funeralExtended.noNotSure")}
          </button>
        </div>

        {funeral.lifeInsurancePolicyExists && (
          <div className="space-y-2">
            <Field
              label={t("forms.funeralExtended.lifeInsurance.companyLabel")}
              value={funeral.lifeInsuranceCompany ?? ""}
              onChange={(v) => onChange({ lifeInsuranceCompany: v })}
              disabled={isReadOnly}
            />
            <Field
              label={t("forms.funeralExtended.lifeInsurance.beneficiaryNameLabel")}
              value={funeral.lifeInsuranceBeneficiary ?? ""}
              onChange={(v) => onChange({ lifeInsuranceBeneficiary: v })}
              disabled={isReadOnly}
            />
            <Field
              label={t("forms.funeralExtended.lifeInsurance.beneficiaryPhoneLabel")}
              value={funeral.lifeInsuranceBeneficiaryPhone ?? ""}
              onChange={(v) =>
                onChange({ lifeInsuranceBeneficiaryPhone: v })
              }
              disabled={isReadOnly}
            />
            <Field
              label={t("forms.funeralExtended.lifeInsurance.amountPaidLabel")}
              placeholder={t("forms.funeralExtended.placeholders.moneyExample10000")}
              value={funeral.lifeInsuranceAmountPaid?.toString() ?? ""}
              onChange={(v) =>
                onChange({
                  lifeInsuranceAmountPaid: v
                    ? Number(v.replace(/[^0-9.]/g, ""))
                    : undefined,
                })
              }
              disabled={isReadOnly}
            />
          </div>
        )}
      </div>

      {/* NEW: Death benefits */}
      <div className="space-y-3 pt-3 border-t border-[var(--color-border-light)] text-xs">
        <h3 className="font-semibold text-[var(--color-navy)]">
          {t("forms.funeralExtended.deathBenefits.title")}
        </h3>
        <p className="text-[var(--color-slate)] text-[11px]">
          {t("forms.funeralExtended.deathBenefits.description")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={t("forms.funeralExtended.deathBenefits.deathBenefitChicagoFundLabel")}
            placeholder="0"
            value={funeral.deathBenefitChicagoFund?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                deathBenefitChicagoFund: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
              })
            }
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.funeralExtended.deathBenefits.lifeHealthAccidentInsuranceLabel")}
            placeholder="0"
            value={funeral.lifeHealthAccidentInsurance?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                lifeHealthAccidentInsurance: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
              })
            }
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.funeralExtended.deathBenefits.unemploymentPaymentsLabel")}
            placeholder="0"
            value={funeral.unemploymentPayments?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                unemploymentPayments: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
              })
            }
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.funeralExtended.deathBenefits.veteransSocialSecurityBurialLabel")}
            placeholder="0"
            value={funeral.veteransSocialSecurityBurial?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                veteransSocialSecurityBurial: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
              })
            }
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.funeralExtended.deathBenefits.workersCompDramShopLabel")}
            placeholder="0"
            value={funeral.workersCompDramShop?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                workersCompDramShop: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
              })
            }
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.funeralExtended.deathBenefits.federalMedicarePublicAidLabel")}
            placeholder="0"
            value={funeral.federalMedicarePublicAid?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                federalMedicarePublicAid: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
              })
            }
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Dependents */}
      <div className="space-y-3 pt-3 border-t border-[var(--color-border-light)]">
        <h3 className="text-xs font-semibold text-[var(--color-navy)]">
          {t("forms.funeralExtended.dependents.title")}
        </h3>

        <div className="space-y-3">
          <Field
            label={t("forms.funeralExtended.dependents.nameLabel")}
            value={dep.name}
            onChange={(v) => updateDep({ name: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.funeralExtended.dependents.relationshipLabel")}
            placeholder={t("forms.funeralExtended.dependents.relationshipPlaceholder")}
            value={dep.relationshipToVictim ?? ""}
            onChange={(v) => updateDep({ relationshipToVictim: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.funeralExtended.dependents.dobLabel")}
            type="date"
            value={dep.dateOfBirth ?? ""}
            onChange={(v) => updateDep({ dateOfBirth: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.funeralExtended.dependents.guardianLabel")}
            value={dep.guardianNamePhone ?? ""}
            onChange={(v) => updateDep({ guardianNamePhone: v })}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <p className="text-[11px] text-[var(--color-muted)]">
        {t("forms.funeralExtended.footerNote")}
      </p>

      <InlineDocumentUploader
        contextLabel={t("forms.funeralExtended.uploaderContextLabel")}
        defaultDocType="funeral_bill"
        disabled={isReadOnly}
      />
    </section>
  );
}

function RecommendedSupportOrgsBlock({
  caseId,
  canRunMatch,
  onMatchesLoaded,
}: {
  caseId: string;
  canRunMatch: boolean;
  onMatchesLoaded?: (count: number) => void;
}) {
  const [matches, setMatches] = useState<
    Array<{
      organization_id: string;
      organization_name: string;
      reasons: string[];
      flags: string[];
      service_overlap: string[];
      language_match: boolean;
      accessibility_match?: string[];
      capacity_signal: string | null;
      virtual_ok?: boolean | null;
      strong_match: boolean;
      possible_match: boolean;
      limited_match: boolean;
      designation_tier?: string | null;
      designation_confidence?: string | null;
      designation_summary?: string | null;
      designation_influenced_match?: boolean;
      designation_reason?: string | null;
    }>
  >([]);
  const [globalFlags, setGlobalFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [runAt, setRunAt] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setForbidden(true);
        return;
      }
      const res = await fetch(`/api/compensation/cases/${caseId}/match-orgs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        return;
      }
      const json = await res.json();
      const d = json.data ?? json;
      const next = Array.isArray(d.matches) ? d.matches : [];
      setMatches(next);
      onMatchesLoaded?.(next.length);
      setGlobalFlags(Array.isArray(d.global_flags) ? d.global_flags : []);
      setRunAt(d.created_at ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [caseId]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/compensation/cases/${caseId}/match-orgs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const json = await res.json();
        const d = json.data ?? json;
        const next = Array.isArray(d.matches) ? d.matches : [];
        setMatches(next);
        onMatchesLoaded?.(next.length);
        setGlobalFlags(Array.isArray(d.global_flags) ? d.global_flags : []);
        setRunAt(new Date().toISOString());
      }
    } finally {
      setRunning(false);
    }
  };

  if (forbidden) {
    return (
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 p-4 mb-4 text-xs text-[var(--color-muted)]">
        <p className="font-medium text-[var(--color-charcoal)]">Recommended support organizations</p>
        <p className="mt-1">
          Your advocate or care team can suggest organizations that fit your situation.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 mb-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-[var(--color-navy)]">Recommended support organizations</p>
        {canRunMatch && (
          <button
            type="button"
            disabled={running}
            onClick={handleRun}
            className="rounded-lg bg-[var(--color-teal-deep)] px-3 py-1 text-[11px] font-medium text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
          >
            {running ? "Updating…" : "Refresh Suggestions"}
          </button>
        )}
      </div>
      <p className="text-[var(--color-muted)] mt-1 text-[11px] leading-relaxed">
        {TRUST_MICROCOPY.recommendationsLead} Always confirm directly with the organization.{" "}
        <a
          href={TRUST_LINK_HREF.matching}
          className="text-[var(--color-slate)] hover:text-white underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          {TRUST_LINK_LABELS.howRecommendationsWork}
        </a>
      </p>
      {loading && <p className="text-[var(--color-muted)] mt-2">Loading…</p>}
      {!loading && globalFlags.map((f, i) => (
        <p key={i} className="text-amber-200/90 mt-2 text-[11px]">
          {f}
        </p>
      ))}
      {!loading && matches.length === 0 && !globalFlags.length && (
        <p className="text-[var(--color-muted)] mt-2 text-[11px] leading-relaxed">
          {canRunMatch
            ? `${EMPTY_COPY.noMatchingResults} Save your application, then tap “Refresh suggestions” to find organizations that may help.`
            : "Suggestions will appear here after your advocate runs organization matching for this case."}
        </p>
      )}
      {!loading && matches.length > 0 && (
        <ul className="mt-3 space-y-3 divide-y divide-[var(--color-border-light)]">
          {matches.map((m) => (
            <li key={m.organization_id} className="pt-3 first:pt-0">
              <RecommendedOrganizationCard match={m} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SummaryView({
  caseId,
  stateCode,
  isReadOnly,
  victim,
  applicant,
  crime,
  losses,
  medical,
  employment,
  funeral,
  certification,
  onChangeCertification,
  onDownloadSummaryPdf,
  onDownloadOfficialIlPdf,
  onDownloadOfficialInPdf,
  onSaveCase,
  fieldState = {},
  app,
  onGoToStep,
  maxStepIndex,
  canRunMatch,
  caseEligibilityResult = null,
  caseStatus = "draft",
  assignedAdvocateId = null,
  onReviewApplication,
}: {
  caseId: string | null;
  stateCode: "IL" | "IN";
  isReadOnly: boolean;
  victim: VictimInfo;
  applicant: ApplicantInfo;
  crime: CrimeInfo;
  losses: LossesClaimed;
  medical: MedicalInfo;
  employment: EmploymentInfo;
  funeral: FuneralInfo;
  certification: CertificationInfo;
  onChangeCertification: (patch: Partial<CertificationInfo>) => void;
  onDownloadSummaryPdf: () => void;
  onDownloadOfficialIlPdf: () => void;
  onDownloadOfficialInPdf: () => void;
  onSaveCase: () => void;
  fieldState?: FieldStateMap;
  app?: CompensationApplication;
  onGoToStep?: (step: IntakeStep) => void;
  maxStepIndex: number;
  canRunMatch: boolean;
  caseEligibilityResult?: EligibilityResult | null;
  caseStatus?: string;
  assignedAdvocateId?: string | null;
  /** Linear walkthrough from step 1; tab bar locked until finished. */
  onReviewApplication?: () => void;
}) {
  const router = useRouter();
  const { t, tf } = useI18n();
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

  const storedApp =
    app && Object.keys(fieldState).length > 0
      ? mergeFieldState(app as unknown as Record<string, unknown>, fieldState)
      : (app ?? {}) as Record<string, unknown> & { _fieldState?: FieldStateMap };
  const review = getReviewStatus(storedApp as Parameters<typeof getReviewStatus>[0]);

  const [summaryMessagesUnread, setSummaryMessagesUnread] = useState(0);
  const [summaryCompleteness, setSummaryCompleteness] = useState<CompletenessSignal | null>(null);
  const [summaryMatchCount, setSummaryMatchCount] = useState(0);

  const [recommendedMatchCount, setRecommendedMatchCount] = useState<number | null>(null);

  useEffect(() => {
    if (!caseId) {
      setSummaryMessagesUnread(0);
      setSummaryCompleteness(null);
      setSummaryMatchCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const [msgRes, compRes, matchRes] = await Promise.all([
          fetch(`/api/cases/${caseId}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/compensation/cases/${caseId}/completeness`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/compensation/cases/${caseId}/match-orgs`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (cancelled) return;
        if (msgRes.ok) {
          const mj = await msgRes.json().catch(() => ({}));
          setSummaryMessagesUnread(Number(mj.unread_count ?? 0));
        } else setSummaryMessagesUnread(0);
        if (compRes.ok) {
          const cj = await compRes.json().catch(() => null);
          const inner = cj?.data?.result ?? cj?.result ?? null;
          setSummaryCompleteness(inner && typeof inner === "object" ? inner : null);
        } else setSummaryCompleteness(null);
        if (matchRes.ok) {
          const mj = await matchRes.json().catch(() => null);
          const matches = mj?.data?.matches ?? mj?.matches ?? [];
          setSummaryMatchCount(Array.isArray(matches) ? matches.length : 0);
        } else setSummaryMatchCount(0);
      } catch {
        if (!cancelled) {
          setSummaryMessagesUnread(0);
          setSummaryCompleteness(null);
          setSummaryMatchCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCanEdit, setInviteCanEdit] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  const handleInvite = async () => {
    if (isReadOnly) return;

    setInviteLoading(true);
    setInviteResult(null);

    try {
      if (!caseId) {
        setInviteResult(t("forms.summary.invite.errors.saveCaseFirst"));
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setInviteResult(t("forms.summary.invite.errors.mustBeLoggedIn"));
        return;
      }

      const res = await fetch("/api/case-access/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caseId,
          advocateEmail: inviteEmail,
          canEdit: inviteCanEdit,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        setInviteResult(text); // keep server error as-is
        return;
      }

      const json = JSON.parse(text);

      // ✅ Use i18n template so Spanish reads naturally
setInviteResult(
  tf("forms.summary.invite.success.accessGranted", { url: json.shareUrl })
);
    } catch (e: any) {
      setInviteResult(
        e?.message || t("forms.summary.invite.errors.unexpected")
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const selectedLosses = Object.entries(losses)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  const primaryProvider = medical.providers[0];
  const primaryJob = employment.employmentHistory[0];
  const primaryFuneralPayer = funeral.payments?.[0];

  const summaryNext = useMemo(() => {
    if (!caseId) return null;
    return getNextActionForCase({
      mode: "victim",
      caseId,
      eligibilityResult: caseEligibilityResult,
      status: caseStatus,
      messagesUnread: summaryMessagesUnread,
      completenessResult: summaryCompleteness,
      matchCount: Math.max(summaryMatchCount, recommendedMatchCount ?? 0),
      intakeMissingReviewCount: review.missing.length,
      intakeDeferredSkippedCount: review.skipped.length + review.deferred.length,
      hasAdvocateConnected: !!assignedAdvocateId,
    });
  }, [
    caseId,
    caseEligibilityResult,
    caseStatus,
    summaryMessagesUnread,
    summaryCompleteness,
    summaryMatchCount,
    recommendedMatchCount,
    review.missing.length,
    review.skipped.length,
    review.deferred.length,
    assignedAdvocateId,
  ]);

  return (
    <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-5 text-sm">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">
        {t("forms.summary.title")}
      </h2>

      {isReadOnly && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          {t("forms.summary.viewOnlyBanner")}
        </div>
      )}

      <p className="text-xs text-[var(--color-slate)]">{t("forms.summary.description")}</p>

      {onReviewApplication && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReviewApplication}
            className="text-xs rounded-lg border border-emerald-500/50 bg-emerald-950/40 px-4 py-2 font-semibold text-emerald-100 hover:bg-emerald-900/50 transition"
          >
            {t("intake.requiredBeforeContinue.reviewApplication")}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-white">
            {t("forms.summary.checkpoint.nextStepTitle")}
          </h3>
          {summaryNext && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityBadgeClassName(summaryNext.priority)}`}
            >
              {priorityLabel(summaryNext.priority)}
            </span>
          )}
        </div>
        {summaryNext ? (
          <>
            <p className="text-xs text-[var(--color-slate)] leading-relaxed">{summaryNext.reason}</p>
            {!isReadOnly && (
              <Link
                href={summaryNext.href}
                className="inline-flex text-xs font-semibold text-[var(--color-teal)] hover:text-[var(--color-teal-deep)]"
              >
                {summaryNext.label} →
              </Link>
            )}
          </>
        ) : (
          <p className="text-xs text-[var(--color-slate)] leading-relaxed">
            {t("forms.summary.checkpoint.whatNextAllClear")}
          </p>
        )}
      </div>

      {/* 1. Application progress */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-warm-cream)]/75 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-[var(--color-navy)]">
          {t("forms.summary.checkpoint.progressTitle")}
        </h3>
        <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
          {tf("forms.summary.checkpoint.progressHint", {
            visited: String(Math.min(maxStepIndex + 1, 9)),
            total: "9",
          })}
        </p>
      </div>

      {/* 2. Missing information */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-amber-100">
          {t("forms.summary.checkpoint.missingTitle")}
        </h3>
        <p className="text-[11px] text-amber-200/80">{t("forms.summary.checkpoint.missingExplainer")}</p>
        {review.missing.length > 0 ? (
          <ul className="text-xs text-[var(--color-charcoal)] space-y-1.5 list-disc list-inside">
            {review.missing.map((item) => (
              <li key={item.fieldKey}>
                {onGoToStep ? (
                  <button
                    type="button"
                    onClick={() => onGoToStep(item.stepHint as IntakeStep)}
                    className="text-amber-300 hover:text-amber-200 underline"
                  >
                    {t("intake.steps." + item.stepHint)}
                  </button>
                ) : (
                  t("intake.steps." + item.stepHint)
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">{t("forms.summary.checkpoint.missingEmpty")}</p>
        )}
        {review.skipped.length > 0 || review.deferred.length > 0 ? (
          <div className="space-y-2 text-xs pt-3 mt-2 border-t border-amber-500/20">
            <p className="text-[11px] text-amber-200/80">{t("forms.summary.checkpoint.deferredExplainer")}</p>
            {review.skipped.length > 0 && (
              <div>
                <span className="font-medium text-[var(--color-slate)]">{t("intake.review.skipped")}:</span>{" "}
                {review.skipped.map((item) => (
                  <span key={item.fieldKey} className="mr-2 inline-block">
                    {onGoToStep ? (
                      <button
                        type="button"
                        onClick={() => onGoToStep(item.stepHint as IntakeStep)}
                        className="text-[var(--color-slate)] hover:text-[var(--color-charcoal)] underline"
                      >
                        {t("intake.steps." + item.stepHint)}
                      </button>
                    ) : (
                      t("intake.steps." + item.stepHint)
                    )}
                  </span>
                ))}
              </div>
            )}
            {review.deferred.length > 0 && (
              <div>
                <span className="font-medium text-[var(--color-slate)]">{t("intake.review.deferred")}:</span>{" "}
                {review.deferred.map((item) => (
                  <span key={item.fieldKey} className="mr-2 inline-block">
                    {onGoToStep ? (
                      <button
                        type="button"
                        onClick={() => onGoToStep(item.stepHint as IntakeStep)}
                        className="text-[var(--color-slate)] hover:text-[var(--color-charcoal)] underline"
                      >
                        {t("intake.steps." + item.stepHint)}
                      </button>
                    ) : (
                      t("intake.steps." + item.stepHint)
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* 4. Documents */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-warm-cream)]/75 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-[var(--color-navy)]">
          {t("forms.summary.checkpoint.documentsTitle")}
        </h3>
        <p className="text-[11px] text-[var(--color-muted)]">{t("forms.summary.checkpoint.documentsSubtitle")}</p>
        <p className="text-xs text-[var(--color-muted)]">{t("forms.summary.checkpoint.documentsEmpty")}</p>
        {onGoToStep && (
          <button
            type="button"
            onClick={() => onGoToStep("documents")}
            className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-1.5 text-[11px] font-medium text-[var(--color-navy)] hover:bg-white transition"
          >
            {t("forms.summary.checkpoint.uploadDocuments")}
          </button>
        )}
      </div>

      {/* 5. Secure messages — dedicated tool at /victim/messages */}
      <div id="summary-secure-messages" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-warm-cream)]/75 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-navy)]">
          {t("forms.summary.checkpoint.messagesTitle")}
        </h3>
        <p className="text-[11px] text-[var(--color-muted)]">{t("forms.summary.checkpoint.messagesSubtitle")}</p>
        {caseId ? (
          <>
            <p className="text-xs text-[var(--color-slate)]">{t("forms.summary.checkpoint.messagesOpenTool")}</p>
            <Link
              href={victimCaseMessagesUrl(caseId)}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600/90 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition"
            >
              {t("forms.summary.checkpoint.messagesOpenToolCta")}
            </Link>
          </>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">{t("forms.summary.checkpoint.messagesEmpty")}</p>
        )}
      </div>

      {/* 6. Recommended support organizations */}
      {caseId ? (
        <RecommendedSupportOrgsBlock
          caseId={caseId}
          canRunMatch={canRunMatch}
          onMatchesLoaded={(n) => setRecommendedMatchCount(n)}
        />
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-xs text-[var(--color-muted)]">
          <p className="font-medium text-[var(--color-charcoal)]">{t("forms.summary.checkpoint.recommendedTitle")}</p>
          <p className="mt-1">{EMPTY_COPY.noMatchingResults}</p>
        </div>
      )}

      <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-warm-cream)]/70 p-4 space-y-4">
        <summary className="text-sm font-semibold text-[var(--color-navy)] cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          {t("forms.summary.checkpoint.applicationDetailsToggle")}
        </summary>
      <div className="pt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 text-xs">
        <div className="space-y-1.5">
          <h3 className="font-semibold text-[var(--color-navy)]">
            {t("forms.summary.sections.victim")}
          </h3>
          <p>
            {victim.firstName} {victim.lastName}
          </p>
          <p>
            {t("forms.summary.labels.dob")}: {victim.dateOfBirth || t("ui.status.none")}
          </p>
          <p>
            {victim.streetAddress}
            {victim.apt ? `, ${victim.apt}` : ""}
          </p>
          <p>
            {victim.city}, {victim.state} {victim.zip}
          </p>
          <p>
            {t("forms.summary.labels.phone")}: {victim.cellPhone || t("ui.status.none")}
          </p>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-[var(--color-navy)]">
            {t("forms.summary.sections.applicant")}
          </h3>

          {applicant.isSameAsVictim ? (
            <p className="text-[var(--color-slate)]">{t("forms.summary.applicant.samePerson")}</p>
          ) : (
            <>
              <p>
                {applicant.firstName} {applicant.lastName}
              </p>
              <p>
                {t("forms.summary.labels.relationship")}:{" "}
                {applicant.relationshipToVictim || t("ui.status.notProvided")}
              </p>
              <p>
                {t("forms.summary.labels.email")}: {applicant.email || t("ui.status.none")}
              </p>
              <p>
                {t("forms.summary.labels.phone")}: {applicant.cellPhone || t("ui.status.none")}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-[var(--color-navy)]">
          {t("forms.summary.sections.crime")}
        </h3>
        <p>
          {t("forms.summary.crime.dateOfCrime")}: {crime.dateOfCrime || t("ui.status.none")}
        </p>
        <p>
          {t("forms.summary.crime.location")}: {crime.crimeAddress || t("ui.status.none")}
        </p>
        <p>
          {t("forms.summary.crime.cityCounty")}: {crime.crimeCity || t("ui.status.none")}
          {crime.crimeCounty ? ` (${crime.crimeCounty})` : ""}
        </p>
        <p>
          {t("forms.summary.crime.reportedTo")}: {crime.reportingAgency || t("ui.status.none")}
        </p>
        <p>
          {t("forms.summary.crime.policeReportNumber")}:{" "}
          {crime.policeReportNumber || t("ui.status.none")}
        </p>
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-[var(--color-navy)]">
          {t("forms.summary.sections.losses")}
        </h3>
        {selectedLosses.length === 0 ? (
          <p className="text-[var(--color-slate)]">{t("forms.summary.losses.noneSelected")}</p>
        ) : (
          <ul className="list-disc list-inside text-[var(--color-slate)]">
{selectedLosses.map((key) => (
  <li key={key}>{t(`forms.summary.losses.${key}`)}</li>
))}
          </ul>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-[var(--color-navy)]">
          {t("forms.summary.sections.medical")}
        </h3>
        {primaryProvider?.providerName ? (
          <>
            <p>
              {t("forms.summary.medical.provider")}: {primaryProvider.providerName}
            </p>
            <p>
              {t("forms.summary.medical.cityPhone")}: {primaryProvider.city || t("ui.status.none")}
              {primaryProvider.phone ? ` / ${primaryProvider.phone}` : ""}
            </p>
            <p>
              {t("forms.summary.medical.serviceDates")}:{" "}
              {primaryProvider.serviceDates || t("ui.status.none")}
            </p>
            <p>
              {t("forms.summary.medical.amount")}:{" "}
              {primaryProvider.amountOfBill != null
                ? `$${primaryProvider.amountOfBill}`
                : t("ui.status.none")}
            </p>
          </>
        ) : (
          <p className="text-[var(--color-slate)]">{t("forms.summary.medical.noneEntered")}</p>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-[var(--color-navy)]">
          {t("forms.summary.sections.employment")}
        </h3>
        {primaryJob?.employerName ? (
          <>
            <p>
              {t("forms.summary.employment.employer")}: {primaryJob.employerName}
            </p>
            <p>
              {t("forms.summary.employment.employerPhone")}:{" "}
              {primaryJob.employerPhone || t("ui.status.none")}
            </p>
            <p>
              {t("forms.summary.employment.netMonthlyWages")}:{" "}
              {primaryJob.netMonthlyWages != null
                ? `$${primaryJob.netMonthlyWages}`
                : t("ui.status.none")}
            </p>
          </>
        ) : (
          <p className="text-[var(--color-slate)]">{t("forms.summary.employment.noneEntered")}</p>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-[var(--color-navy)]">
          {t("forms.summary.sections.funeral")}
        </h3>
        {funeral.funeralHomeName || funeral.funeralBillTotal ? (
          <>
            <p>
              {t("forms.summary.funeral.funeralHome")}: {funeral.funeralHomeName || t("ui.status.none")}
            </p>
            <p>
              {t("forms.summary.funeral.funeralHomePhone")}: {funeral.funeralHomePhone || t("ui.status.none")}
            </p>
            <p>
              {t("forms.summary.funeral.totalBill")}:{" "}
              {funeral.funeralBillTotal != null
                ? `$${funeral.funeralBillTotal}`
                : t("ui.status.none")}
            </p>

            {primaryFuneralPayer?.payerName ? (
              <>
                <p>
                  {t("forms.summary.funeral.payer")}: {primaryFuneralPayer.payerName} (
                  {primaryFuneralPayer.relationshipToVictim ||
                    t("forms.summary.funeral.relationshipNotSet")}
                  )
                </p>
                <p>
                  {t("forms.summary.funeral.amountPaid")}:{" "}
                  {primaryFuneralPayer.amountPaid != null
                    ? `$${primaryFuneralPayer.amountPaid}`
                    : t("ui.status.none")}
                </p>
              </>
            ) : (
              <p className="text-[var(--color-slate)]">{t("forms.summary.funeral.noPayer")}</p>
            )}
          </>
        ) : (
          <p className="text-[var(--color-slate)]">{t("forms.summary.funeral.noneEntered")}</p>
        )}
      </div>

      </div>
      </details>

      <div className="space-y-1.5 text-xs pt-3 border-t border-[var(--color-border-light)]">
        <h3 className="font-semibold text-[var(--color-navy)]">
          {t("forms.summary.certification.title")}
        </h3>

        <div className="space-y-2 mt-2">
          <label className={`flex items-start gap-2 text-[11px] text-[var(--color-charcoal)] ${disBtn}`}>
            <input
              disabled={isReadOnly}
              type="checkbox"
              checked={!!certification.acknowledgesSubrogation}
              onChange={(e) =>
                onChangeCertification({ acknowledgesSubrogation: e.target.checked })
              }
              className="mt-[2px] h-3 w-3 rounded border-[var(--color-border)] bg-[var(--color-warm-white)] text-[var(--color-teal)] disabled:opacity-60"
            />
            <span className="flex flex-wrap items-center gap-1">
              {t("forms.summary.certification.checks.subrogation")}{" "}
              <ExplainThisButton
                sourceText={t("forms.summary.certification.checks.subrogation")}
                contextType="form_label"
                workflowKey="compensation_intake"
                fieldKey="certification.acknowledgesSubrogation"
                stateCode={stateCode ?? undefined}
                label={t("intake.explainThis")}
                variant="link"
              />
            </span>
          </label>

          <label className={`flex items-start gap-2 text-[11px] text-[var(--color-charcoal)] ${disBtn}`}>
            <input
              disabled={isReadOnly}
              type="checkbox"
              checked={!!certification.acknowledgesRelease}
              onChange={(e) =>
                onChangeCertification({ acknowledgesRelease: e.target.checked })
              }
              className="mt-[2px] h-3 w-3 rounded border-[var(--color-border)] bg-[var(--color-warm-white)] text-[var(--color-teal)] disabled:opacity-60"
            />
            <span>{t("forms.summary.certification.checks.release")}</span>
          </label>

          <label className={`flex items-start gap-2 text-[11px] text-[var(--color-charcoal)] ${disBtn}`}>
            <input
              disabled={isReadOnly}
              type="checkbox"
              checked={!!certification.acknowledgesPerjury}
              onChange={(e) =>
                onChangeCertification({ acknowledgesPerjury: e.target.checked })
              }
              className="mt-[2px] h-3 w-3 rounded border-[var(--color-border)] bg-[var(--color-warm-white)] text-[var(--color-teal)] disabled:opacity-60"
            />
            <span>{t("forms.summary.certification.checks.perjury")}</span>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          <Field
            label={t("forms.summary.certification.signatureLabel")}
            value={certification.applicantSignatureName ?? ""}
            onChange={(v) => onChangeCertification({ applicantSignatureName: v })}
            disabled={isReadOnly}
          />
          <Field
            label={t("forms.summary.certification.dateLabel")}
            type="date"
            value={certification.applicantSignatureDate ?? ""}
            onChange={(v) => onChangeCertification({ applicantSignatureDate: v })}
            disabled={isReadOnly}
          />
        </div>

        <div className="space-y-2 mt-3">
          <p className="text-[11px] text-[var(--color-charcoal)]">
            {t("forms.summary.certification.attorney.question")}
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => !isReadOnly && onChangeCertification({ representedByAttorney: true })}
              className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                certification.representedByAttorney
                  ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
              }`}
            >
              {t("common.yes")}
            </button>

            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => !isReadOnly && onChangeCertification({ representedByAttorney: false })}
              className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                certification.representedByAttorney === false
                  ? "border-[var(--color-teal)] bg-[var(--color-teal-light)]/80 text-[var(--color-charcoal)]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-slate)]"
              }`}
            >
              {t("common.no")}
            </button>
          </div>

          {certification.representedByAttorney && (
            <div className="grid gap-3 sm:grid-cols-2 mt-2">
              <Field
                label={t("forms.summary.certification.attorney.name")}
                value={certification.attorneyName ?? ""}
                onChange={(v) => onChangeCertification({ attorneyName: v })}
                disabled={isReadOnly}
              />
              <Field
                label={t("forms.summary.certification.attorney.ardc")}
                value={certification.attorneyArdc ?? ""}
                onChange={(v) => onChangeCertification({ attorneyArdc: v })}
                disabled={isReadOnly}
              />
              <Field
                label={t("forms.summary.certification.attorney.address")}
                value={certification.attorneyAddress ?? ""}
                onChange={(v) => onChangeCertification({ attorneyAddress: v })}
                disabled={isReadOnly}
              />
              <Field
                label={t("forms.summary.certification.attorney.city")}
                value={certification.attorneyCity ?? ""}
                onChange={(v) => onChangeCertification({ attorneyCity: v })}
                disabled={isReadOnly}
              />
              <Field
                label={t("forms.summary.certification.attorney.state")}
                value={certification.attorneyState ?? ""}
                onChange={(v) => onChangeCertification({ attorneyState: v })}
                disabled={isReadOnly}
              />
              <Field
                label={t("forms.summary.certification.attorney.zip")}
                value={certification.attorneyZip ?? ""}
                onChange={(v) => onChangeCertification({ attorneyZip: v })}
                disabled={isReadOnly}
              />
              <Field
                label={t("forms.summary.certification.attorney.phone")}
                value={certification.attorneyPhone ?? ""}
                onChange={(v) => onChangeCertification({ attorneyPhone: v })}
                disabled={isReadOnly}
              />
              <Field
                label={t("forms.summary.certification.attorney.email")}
                value={certification.attorneyEmail ?? ""}
                onChange={(v) => onChangeCertification({ attorneyEmail: v })}
                disabled={isReadOnly}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onDownloadSummaryPdf}
          className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[11px] text-[var(--color-navy)] hover:bg-[var(--color-light-sand)] transition"
        >
          {t("forms.summary.actions.downloadSummaryPdf")}
        </button>

        <button
          type="button"
          onClick={stateCode === "IN" ? onDownloadOfficialInPdf : onDownloadOfficialIlPdf}
          className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[11px] text-[var(--color-navy)] hover:bg-[var(--color-light-sand)] transition"
        >
          {stateCode === "IN"
            ? t("forms.summary.actions.downloadOfficialIn")
            : t("forms.summary.actions.downloadOfficialIl")}
        </button>

        {!caseId && !isReadOnly && (
          <button
            type="button"
            onClick={onSaveCase}
            className="inline-flex items-center rounded-lg border border-blue-600 bg-[var(--color-teal-deep)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--color-teal)] transition"
          >
            {t("forms.summary.actions.saveCaseForAdvocate")}
          </button>
        )}

        <button
          type="button"
          disabled={isReadOnly}
          onClick={() => {
            if (isReadOnly) return;
            setInviteResult(null);
            setInviteOpen(true);
          }}
          className={`inline-flex items-center rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[11px] text-[var(--color-navy)] hover:bg-[var(--color-light-sand)] transition ${disBtn}`}
        >
          {t("forms.summary.actions.inviteAdvocate")}
        </button>
      </div>

      {inviteOpen && (
        <div className="mt-4 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-[var(--color-navy)]">
              {t("forms.summary.invite.title")}
            </div>
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="text-[var(--color-muted)] hover:text-[var(--color-charcoal)]"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-[var(--color-muted)]">
            {t("forms.summary.invite.note")}
          </p>

          <label className="block space-y-1">
            <span className="text-[var(--color-slate)]">
              {t("forms.summary.invite.advocateEmailLabel")}
            </span>
            <input
              disabled={isReadOnly}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t("forms.summary.invite.advocateEmailPlaceholder")}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2 text-xs text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)] focus:border-[var(--color-teal)] disabled:opacity-60"
            />
          </label>

          <label className="flex items-center gap-2 text-[var(--color-slate)]">
            <input
              disabled={isReadOnly}
              type="checkbox"
              checked={inviteCanEdit}
              onChange={(e) => setInviteCanEdit(e.target.checked)}
            />
            {t("forms.summary.invite.allowEdit")}
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleInvite}
              disabled={isReadOnly || inviteLoading || !inviteEmail.trim()}
              className="rounded-lg bg-[var(--color-teal-deep)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[var(--color-teal)] transition"
            >
              {inviteLoading
                ? t("forms.summary.actions.inviting")
                : t("forms.summary.actions.sendInvite")}
            </button>

            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-charcoal)] hover:bg-[var(--color-warm-cream)]/85 transition"
            >
              {t("ui.buttons.close")}
            </button>
          </div>

          {inviteResult && (
            <pre className="whitespace-pre-wrap text-[11px] text-[var(--color-charcoal)] bg-[var(--color-warm-cream)]/85 border border-[var(--color-border-light)] rounded-lg p-2">
{inviteResult}
            </pre>
          )}
        </div>
      )}

    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-xs text-[var(--color-charcoal)] space-y-1">
      <span>{label}</span>
      <input
        disabled={disabled}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2 text-xs text-[var(--color-navy)] placeholder:text-[var(--color-muted)]
          focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)] focus:border-[var(--color-teal)]
          disabled:opacity-60 disabled:cursor-not-allowed`}
      />
    </label>
  );
}

function Checkbox({ label, checked, onChange, disabled = false }: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-[11px] text-[var(--color-charcoal)] cursor-pointer">
      <input
        disabled={disabled}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-[2px] h-3 w-3 rounded border-[var(--color-border)] bg-[var(--color-warm-white)] text-[var(--color-teal)] disabled:opacity-60 disabled:cursor-not-allowed"
      />
      <span className={disabled ? "opacity-60" : ""}>{label}</span>
    </label>
  );
}

function DocumentsStep({ isReadOnly }: { isReadOnly?: boolean }) {
  const { t } = useI18n();
  return (
    <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4 text-xs">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">
        {t("forms.documents.stepTitle")}
      </h2>

      {isReadOnly && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          {t("forms.documents.viewOnlyBanner")}
        </div>
      )}

      <p className="text-[var(--color-slate)]">
        {t("forms.documents.intro")}
      </p>

      <ul className="list-disc list-inside text-[var(--color-slate)] space-y-1">
        <li>{t("forms.documents.bullets.police")}</li>
        <li>{t("forms.documents.bullets.medical")}</li>
        <li>{t("forms.documents.bullets.funeral")}</li>
        <li>{t("forms.documents.bullets.wages")}</li>
        <li>{t("forms.documents.bullets.other")}</li>
      </ul>

      <p className="text-[11px] text-[var(--color-muted)]">
        {t("forms.documents.disclaimer")}
      </p>

      <a
        href={isReadOnly ? undefined : "/compensation/documents"}
        className={`inline-flex items-center rounded-lg px-3 py-1.5 text-[11px] font-semibold transition
          ${
            isReadOnly
              ? "cursor-not-allowed border border-[var(--color-border)] bg-[var(--color-light-sand)] text-[var(--color-muted)]"
              : "border-blue-600 bg-[var(--color-teal-deep)] text-white hover:bg-[var(--color-teal)]"
          }`}
        aria-disabled={isReadOnly}
      >
        {t("forms.documents.goToUploadPage")} →
      </a>
    </section>
  );
}

function InlineDocumentUploader({
  contextLabel,
  defaultDocType,
  disabled = false,
}: {
  contextLabel: string;
  defaultDocType: string;
  disabled?: boolean;
}) {
  const { t, tf } = useI18n();
  const [description, setDescription] = useState("");

const handleFiles = async (files: FileList | null) => {
  if (disabled) return;
  if (!files || files.length === 0) return;

    // ✅ Use Promise.all (async-safe). Avoid async forEach.
    await Promise.all(
      Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("docType", defaultDocType);
        formData.append("description", description);

        try {
          // 🔐 Get the logged-in user's access token
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;

          const res = await fetch("/api/compensation/upload-document", {
            method: "POST",
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            body: formData,
          });

          if (!res.ok) {
            const text = await res.text();
            console.error(`[UPLOAD] Failed for ${defaultDocType}`, text);
            alert(
              "We couldn’t upload that file. The server may have rejected the format or size. Try a PDF, JPG, or PNG under the size limit, then upload again.",
            );
            return;
          }

          const json = await res.json();
          console.log("[UPLOAD] Stored document:", json.document);
        } catch (err) {
          console.error("[UPLOAD] Error uploading document", err);
          alert(
            "We couldn’t reach the server to upload that file. Check your connection, wait a moment, and try uploading again.",
          );
        }
      })
    );

    // ✅ Clear description after uploads finish
    setDescription("");
  };

  // ✅ IMPORTANT: Component return is OUTSIDE handleFiles
  return (
    <div className="mt-4 pt-4 border-t border-[var(--color-border-light)] space-y-3 text-xs">
      <h3 className="font-semibold text-[var(--color-navy)]">
        {tf("forms.documents.uploader.title", { context: contextLabel })}
      </h3>
      <p className="text-[11px] text-[var(--color-muted)]">
        {t("forms.documents.uploader.helper")}
      </p>

      <div className="grid gap-2 sm:grid-cols-[2fr,3fr]">
        <label className="block text-[11px] text-[var(--color-charcoal)] space-y-1">
          <span>{t("forms.documents.uploader.shortDescriptionLabel")}</span>
          <input
            disabled={disabled}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("forms.documents.uploader.shortDescriptionPlaceholder")}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-1.5 text-[11px] text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)] focus:border-[var(--color-teal)]"
          />
        </label>

        <label className="block text-[11px] text-[var(--color-charcoal)] space-y-1">
          <span>{t("forms.documents.uploader.uploadLabel")}</span>
          <input
            disabled={disabled}
            type="file"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="block w-full text-[11px] text-[var(--color-slate)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-teal-deep)] file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-white hover:file:bg-[var(--color-teal)]"
          />
        </label>
      </div>
    </div>
  );
}

export default function CompensationIntakePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
          <div className="max-w-3xl mx-auto">Loading…</div>
          
        </main>
      }
    >
      <CompensationIntakeInner />
    </Suspense>
  );
}
