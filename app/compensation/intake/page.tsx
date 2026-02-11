// app/compensation/intake/page.tsx
"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n/i18nProvider";

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

type IntakeStep =
  | "victim"
  | "applicant"
  | "crime"
  | "losses"
  | "medical"
  | "employment"
  | "funeral"
  | "documents"
  | "summary";

const STORAGE_KEY_PREFIX = "nxtstps_compensation_intake_v1";
const ACTIVE_CASE_KEY_PREFIX = "nxtstps_active_case_";
const PROGRESS_KEY_PREFIX = "nxtstps_intake_progress_";

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
const { t, tf, lang } = useI18n();

  useEffect(() => {
  (async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push("/login");
    }
  })();
}, [router]);

  const [step, setStep] = useState<IntakeStep>("victim");
  const [maxStepIndex, setMaxStepIndex] = useState(0);
  const [app, setApp] = useState<CompensationApplication>(
    makeEmptyApplication()
  );

  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true); // ✅ local mode default true
  const isReadOnly = !!caseId && !canEdit;
const [savingCase, setSavingCase] = useState(false); // ✅ shows "Saving..."
const [saveToast, setSaveToast] = useState<string | null>(null);
const [saveNowLoading, setSaveNowLoading] = useState(false);
const creatingCaseRef = useRef(false);


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
        console.error("Failed to load case:", await res.text());
        alert(t("intake.loadCase.failed"));
        router.push("/");
        return;
      }

      const json = await res.json();
      setCanEdit(!!json.access?.can_edit);

      const rawApp = json.case.application;
      const loadedApp = typeof rawApp === "string" ? JSON.parse(rawApp) : rawApp;

      setApp(loadedApp);
      setStep("victim");
      setMaxStepIndex(0);
      setLoadedFromStorage(true);

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (uid) localStorage.setItem(`${ACTIVE_CASE_KEY_PREFIX}${uid}`, caseId);
    } catch (err) {
      console.error("Unexpected error loading case from API:", err);
      alert(t("intake.loadCase.unexpected"));
      router.push("/");
    }
  })();
}, [caseId, router, t]); // ✅ add t


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
        app?: CompensationApplication;
        step?: IntakeStep;
        maxStepIndex?: number;
      };

      if (parsed.app) setApp(parsed.app);
      if (parsed.step) setStep(parsed.step);
      if (typeof parsed.maxStepIndex === "number") setMaxStepIndex(parsed.maxStepIndex);
    } else {
      // ✅ no saved draft for THIS user → start fresh
      setApp(makeEmptyApplication());
      setStep("victim");
      setMaxStepIndex(0);
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

      // ✅ IMPORTANT: your /api/compensation/cases POST currently expects the BODY to be the application object
      const res = await fetch("/api/compensation/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(app), // ✅ FIXED (was {status, application})
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
}, [caseId, userId, loadedFromStorage, router, app]);

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
  const order: IntakeStep[] = [
    "victim",
    "applicant",
    "crime",
    "losses",
    "medical",
    "employment",
    "funeral",
    "documents",
    "summary",
  ];

  const idx = Math.max(0, order.indexOf(step));
  setMaxStepIndex((prev) => Math.max(prev, idx));
}, [step]);

// 🟡 2. Auto-save whenever the application or step changes
useEffect(() => {
  if (typeof window === "undefined") return;
  if (caseId) return; // ✅ ADD THIS
  if (!loadedFromStorage) return;
  if (!storageKey) return;

  try {
    const payload = { app, step, maxStepIndex };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to save compensation intake to localStorage", err);
  }
}, [caseId, loadedFromStorage, storageKey, app, step, maxStepIndex]);

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

      const res = await fetch(`/api/compensation/cases/${caseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ application: app }),
      });

      if (!res.ok) {
        console.error("PATCH case save failed:", await res.text());
      }
    } catch (err) {
      console.error("Failed to autosave case to Supabase", err);
    } finally {
      setSavingCase(false);
    }
  }, 800); // debounce: prevents spam while typing

  return () => clearTimeout(timeout);
}, [caseId, loadedFromStorage, canEdit, app]);

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

const handleSaveNow = async () => {
  // If this user is viewing a case but can't edit, don't allow saving
  if (caseId && !canEdit) {
setSaveToast(t("intake.save.viewOnly"));
    setTimeout(() => setSaveToast(null), 2000);
    return;
  }

  // If there is no caseId (shouldn’t happen after “case created on start”),
  // you can either block or fallback. I’m blocking with a clear message:
  if (!caseId) {
setSaveToast(t("intake.save.noCaseLoaded"));
    setTimeout(() => setSaveToast(null), 2000);
    return;
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

setSaveToast(t("intake.save.saved"));
    setTimeout(() => setSaveToast(null), 2000);
  } catch (e) {
    console.error("Save now failed:", e);
setSaveToast(t("intake.save.failed"));
    setTimeout(() => setSaveToast(null), 2500);
  } finally {
    setSaveNowLoading(false);
  }
};
  
  const handleNextFromVictim = () => {
    if (
      !victim.firstName.trim() ||
      !victim.lastName.trim() ||
      !victim.dateOfBirth ||
      !victim.streetAddress.trim() ||
      !victim.city.trim() ||
      !victim.zip.trim()
    ) {
alert(t("intake.validation.victimRequired"));
      return;
    }
    setStep("applicant");
    setMaxStepIndex((prev) => Math.max(prev, 1));
  };

  const handleDownloadOfficialIlPdf = async () => {
  try {
    const res = await fetch("/api/compensation/official-pdf/il", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // We send the whole application object so the backend can fill the form
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
    console.log("Saving case with application:", app);

const { data: sessionData } = await supabase.auth.getSession();
const accessToken = sessionData.session?.access_token;

const res = await fetch("/api/compensation/cases", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  },
  body: JSON.stringify(app),
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
      const res = await fetch("/api/nxtguide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
body: JSON.stringify({
  messages: newMessages,
  currentRoute: "/compensation/intake",
  currentStep: step,
  application: app,
  locale: lang,
}),
      });

      if (!res.ok) {
        console.error("NxtGuide error:", await res.text());
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",

content: t("nxtGuide.errors.respondFailed")
          },
        ]);
        return;
      }

      const json = await res.json();
      const reply = (json.reply as string) || "";

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
        },
      }));
    }
    setStep("crime");
    setMaxStepIndex((prev) => Math.max(prev, 2));
  };

  const handleNextFromCrime = () => {
    if (
      !crime.dateOfCrime ||
      !crime.crimeAddress.trim() ||
      !crime.crimeCity.trim() ||
      !crime.reportingAgency.trim()
    ) {
    
alert(t("intake.validation.crimeMinimumRequired"));
      return;
    }
    setStep("losses");
    setMaxStepIndex((prev) => Math.max(prev, 3));
  };

  const handleNextFromLosses = () => {
    const anySelected = Object.values(losses).some(Boolean);
    if (!anySelected) {
      const ok = window.confirm(t("intake.confirm.noLossesSelected"))

      if (!ok) return;
    }
    setStep("medical");
    setMaxStepIndex((prev) => Math.max(prev, 4));
  };

const handleNextFromMedical = () => {
  // For now we don't force them to enter medical details; they might not have medical costs.
  setStep("employment");
  setMaxStepIndex((prev) => Math.max(prev, 5));
};

const handleNextFromEmployment = () => {
  if (losses.lossOfEarnings && !employment.employmentHistory.length) {
    const ok = window.confirm(t("intake.confirm.lossOfEarningsNoEmployer"))

    if (!ok) return;
  }
  setStep("funeral");
  setMaxStepIndex((prev) => Math.max(prev, 6));
};

const handleNextFromFuneral = () => {
  // If they selected funeral-related losses but left everything blank, soft-warning only.
  const funeralSelected = losses.funeralBurial || losses.headstone;
  const noFuneralData =
    !funeral.funeralHomeName &&
    !funeral.funeralBillTotal &&
    (!funeral.payments || funeral.payments.length === 0);

  if (funeralSelected && noFuneralData) {
    const ok = window.confirm(t("intake.confirm.funeralSelectedNoData"));
    if (!ok) return;
  }

  // ✅ Correct next step
  setStep("documents");
  setMaxStepIndex((prev) => Math.max(prev, 7));
};


const handleBack = () => {
  if (step === "applicant") setStep("victim");
  else if (step === "crime") setStep("applicant");
  else if (step === "losses") setStep("crime");
  else if (step === "medical") setStep("losses");
  else if (step === "employment") setStep("medical");
  else if (step === "funeral") setStep("employment");
  else if (step === "documents") setStep("funeral"); // ✅ add this
  else if (step === "summary") setStep("documents");  // ✅ summary goes back to documents
};

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
            {t("intake.header.badge")}
          </p>

          {isReadOnly && (
  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
      {t("intake.viewOnlyBanner")}
  </div>
)}
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t("intake.header.title")}
          </h1>
          <p className="text-sm text-slate-300">
          {t("intake.header.subtitle")}
          </p>

        <p className="text-[11px] text-slate-500">
{t("intake.header.needMoreContext")}{" "}
  <a
    href="/knowledge/compensation"
    className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
  >
{t("intake.header.learnLink")}
  </a>
</p>
        </header>

        {/* Step indicator */}
<div className="flex flex-wrap gap-2 text-xs text-slate-300">
<StepBadge label={t("intake.steps.victim")} active={step === "victim"} onClick={() => setStep("victim")} />
<StepBadge label={t("intake.steps.applicant")} active={step === "applicant"} onClick={() => setStep("applicant")} />
<StepBadge label={t("intake.steps.crime")} active={step === "crime"} onClick={() => setStep("crime")} />
<StepBadge label={t("intake.steps.losses")} active={step === "losses"} onClick={() => setStep("losses")} />
<StepBadge label={t("intake.steps.medical")} active={step === "medical"} onClick={() => setStep("medical")} />
<StepBadge label={t("intake.steps.employment")} active={step === "employment"} onClick={() => setStep("employment")} />
<StepBadge label={t("intake.steps.funeral")} active={step === "funeral"} onClick={() => setStep("funeral")} />
<StepBadge label={t("intake.steps.documents")} active={step === "documents"} onClick={() => setStep("documents")} />
<StepBadge label={t("intake.steps.summary")} active={step === "summary"} onClick={() => setStep("summary")} />
</div>

        {/* Step content */}
{step === "victim" && (
<VictimForm victim={victim} onChange={updateVictim} isReadOnly={isReadOnly} />
)}

{step === "applicant" && (
  <>
    <ApplicantForm applicant={applicant} onChange={updateApplicant} isReadOnly={isReadOnly} />
    <ContactForm contact={contact} onChange={updateContact} isReadOnly={isReadOnly} />
  </>
)}

{step === "crime" && (
  <>
<CrimeForm crime={crime} onChange={updateCrime} isReadOnly={isReadOnly} />
<CourtForm court={court} onChange={updateCourt} isReadOnly={isReadOnly} />
  </>
)}

{step === "losses" && (
<LossesForm losses={losses} onChange={updateLosses} isReadOnly={isReadOnly} />
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
    caseId={caseId} // ✅ ADD THIS LINE
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
    onSaveCase={handleSaveCase}
  />
)}

{/* Nav buttons + primary actions */}
<div className="flex flex-col gap-3 pt-4 border-t border-slate-800 sm:flex-row sm:items-center sm:justify-between">
{/* Left side: Back + Save */}
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={handleBack}
    disabled={step === "victim"}
    className="text-xs rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-900 transition"
  >
{t("intake.actions.back")}
  </button>

  <button
    type="button"
    onClick={handleSaveNow}
    disabled={saveNowLoading || !caseId || !canEdit}
    className="text-xs rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
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

  {caseId && canEdit && savingCase && (
    <span className="text-[11px] text-slate-400">{t("intake.actions.autoSaving")}</span>
  )}
</div>

  {/* Right side: step-specific primary button */}
  <div className="flex items-center justify-end">
    {step === "victim" && (
      <button
        type="button"
        onClick={handleNextFromVictim}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
{tf("intake.actions.continueToStep", { step: t("intake.steps.applicant") })}
      </button>
    )}

    {step === "applicant" && (
      <button
        type="button"
        onClick={handleNextFromApplicant}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
{tf("intake.actions.continueToStep", { step: t("intake.steps.crime") })}
      </button>
    )}

    {step === "crime" && (
      <button
        type="button"
        onClick={handleNextFromCrime}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
{tf("intake.actions.continueToStep", { step: t("intake.steps.losses") })}
      </button>
    )}

    {step === "losses" && (
      <button
        type="button"
        onClick={handleNextFromLosses}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
{tf("intake.actions.continueToStep", { step: t("intake.steps.medical") })}
      </button>
    )}

    {step === "medical" && (
      <button
        type="button"
        onClick={handleNextFromMedical}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
{tf("intake.actions.continueToStep", { step: t("intake.steps.employment") })}
      </button>
    )}

    {step === "employment" && (
      <button
        type="button"
        onClick={handleNextFromEmployment}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
{tf("intake.actions.continueToStep", { step: t("intake.steps.funeral") })}
      </button>
    )}

    {step === "funeral" && (
      <button
        type="button"
        onClick={handleNextFromFuneral}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
{tf("intake.actions.goToStep", { step: t("intake.steps.documents") })}
      </button>
    )}

    {step === "documents" && (
      <button
        type="button"
        onClick={() => setStep("summary")}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
{tf("intake.actions.goToStep", { step: t("intake.steps.summary") })}
      </button>
    )}

    {step === "summary" && (
      <button
        type="button"
        onClick={() => setSaveToast(t("forms.summary.placeholders.alreadyFinalReview"))

        }
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
{t("intake.actions.reviewComplete")}
      </button>
    )}
  </div>
</div>

        <p className="text-[11px] text-slate-500">
{t("intake.footer.draftDisclaimer")}
        </p>
      </div>

            {/* NxtGuide chat widget (intake) */}
      <div className="fixed bottom-4 right-4 z-40">
        {chatOpen ? (
          <div className="w-72 sm:w-80 rounded-2xl border border-slate-700 bg-[#020b16] shadow-lg shadow-black/40 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0A2239]">
              <div className="text-[11px]">
                <div className="font-semibold text-slate-50">NxtGuide</div>
                <div className="text-slate-300">
{t("nxtGuide.subtitle")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
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
                        ? "bg-[#1C8C8C] text-slate-950"
                        : "bg-slate-900 text-slate-100 border border-slate-700"
                    } text-[11px] whitespace-pre-wrap`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <p className="text-[11px] text-slate-400">
{t("nxtGuide.typing")}
                </p>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="border-t border-slate-800 p-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
placeholder={t("nxtGuide.placeholders.ask")}
                className="w-full rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#1C8C8C] focus:border-[#1C8C8C]"
              />
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="inline-flex items-center rounded-full bg-[#1C8C8C] px-3 py-2 text-[11px] font-semibold text-slate-950 shadow-md shadow-black/40 hover:bg-[#21a3a3] transition"
          >
{t("nxtGuide.floating.needHelpOnThisStep")}
          </button>
        )}
      </div>
      {saveToast && (
  <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full border border-slate-700 bg-slate-950/90 px-4 py-2 text-xs text-slate-100 shadow-lg">
    {saveToast}
  </div>
)}
      
    </main>
  );
}

function StepBadge({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const baseClasses =
    "px-2 py-1 rounded-full border text-[11px] transition";
  const stateClasses = disabled
    ? "border-slate-800 bg-slate-900 text-slate-500 cursor-not-allowed opacity-60"
    : active
    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200 cursor-pointer"
    : "border-slate-700 bg-slate-900 text-slate-400 hover:border-emerald-400 hover:text-emerald-200 cursor-pointer";

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
  onChange,
  isReadOnly,
}: {
  victim: VictimInfo;
  onChange: (patch: Partial<VictimInfo>) => void;
  isReadOnly: boolean;
}) {
const { t } = useI18n();
const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

  const disabilityTypes = ["physical", "mental", "developmental", "other"] as const;

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        {t("forms.victim.title")}
      </h2>

      <p className="text-xs text-slate-300">
        {t("forms.victim.description")}
      </p>

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

      <div className="space-y-3 pt-3 border-t border-slate-800">
        <p className="text-[11px] text-slate-400">
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
          <p className="text-slate-200">{t("fields.hasDisability.question")}</p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => !isReadOnly && onChange({ hasDisability: true })}
              className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                victim.hasDisability
                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
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
                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
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
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 bg-slate-900 text-slate-300"
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
  isReadOnly,
}: {
  applicant: ApplicantInfo;
  onChange: (patch: Partial<ApplicantInfo>) => void;
  isReadOnly: boolean;
}) {
  const { t } = useI18n(); // NEW: match VictimForm structure
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        {t("forms.applicant.title")}
      </h2>

      <p className="text-xs text-slate-300">{t("forms.applicant.description")}</p>

      <div className="space-y-2 text-xs">
        <p className="text-slate-200">
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
          <p className="text-[11px] text-slate-400">
            {t("forms.applicant.sameAsVictimNote")}
          </p>
        )}
      </div>

      {!applicant.isSameAsVictim && (
        <div className="space-y-4 pt-3 border-t border-slate-800">
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
          <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
            <p className="text-slate-200">
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
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
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
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
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

          <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
            <p className="text-slate-200">
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
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
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
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
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
  isReadOnly,
}: {
  contact: AdvocateContact;
  onChange: (patch: Partial<AdvocateContact>) => void;
  isReadOnly: boolean;
}) {
  const { t } = useI18n();
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4 mt-4">
      <h2 className="text-lg font-semibold text-slate-50">
        {t("forms.contact.title")}
      </h2>

      <p className="text-xs text-slate-300">{t("forms.contact.description")}</p>

      {/* Language preference */}
      <div className="space-y-2 text-xs">
        <p className="text-slate-200">
          {t("forms.contact.prefersEnglishQuestion")}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ prefersEnglish: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              contact.prefersEnglish === true
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
      <div className="space-y-2 text-xs pt-3 border-t border-slate-800">
        <p className="text-slate-200">
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
              <p className="text-slate-200">
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
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 bg-slate-900 text-slate-300"
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
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 bg-slate-900 text-slate-300"
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
      <div className="space-y-2 text-xs pt-3 border-t border-slate-800">
        <p className="text-slate-200">
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
  isReadOnly,
}: {
  crime: CrimeInfo;
  onChange: (patch: Partial<CrimeInfo>) => void;
  isReadOnly: boolean;
}) {
  const { t } = useI18n();
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        {t("forms.crime.title")}
      </h2>

      <p className="text-xs text-slate-300">{t("forms.crime.description")}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("forms.crime.dateOfCrimeLabel")}
          type="date"
          value={crime.dateOfCrime}
          onChange={(v) => onChange({ dateOfCrime: v })}
          disabled={isReadOnly}
        />
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

      <Field
        label={t("forms.crime.crimeDescriptionLabel")}
        placeholder={t("forms.crime.crimeDescriptionPlaceholder")}
        value={crime.crimeDescription ?? ""}
        onChange={(v) => onChange({ crimeDescription: v })}
        disabled={isReadOnly}
      />

      <Field
        label={t("forms.crime.injuryDescriptionLabel")}
        placeholder={t("forms.crime.injuryDescriptionPlaceholder")}
        value={crime.injuryDescription ?? ""}
        onChange={(v) => onChange({ injuryDescription: v })}
        disabled={isReadOnly}
      />

      <div className="space-y-2 text-xs">
        <p className="text-slate-200">{t("forms.crime.offenderKnownQuestion")}</p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ offenderKnown: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              crime.offenderKnown
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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

      <div className="space-y-2 text-xs pt-2 border-t border-slate-800">
        <p className="text-slate-200">
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
  isReadOnly,
}: {
  court: CourtInfo;
  onChange: (patch: Partial<CourtInfo>) => void;
  isReadOnly: boolean;
}) {
  const { t } = useI18n();
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4 mt-4">
      <h2 className="text-lg font-semibold text-slate-50">
        {t("forms.court.title")}
      </h2>

      <p className="text-xs text-slate-300">
        {t("forms.court.description")}
      </p>

      {/* Arrested */}
      <div className="space-y-2 text-xs">
        <p className="text-slate-200">{t("forms.court.offenderArrestedQuestion")}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ offenderArrested: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.offenderArrested
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {t("forms.court.noNotSure")}
          </button>
        </div>
      </div>

      {/* Charged */}
      <div className="space-y-2 text-xs">
        <p className="text-slate-200">{t("forms.court.offenderChargedQuestion")}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ offenderCharged: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.offenderCharged
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {t("forms.court.noNotSure")}
          </button>
        </div>
      </div>

      {/* Testified */}
      <div className="space-y-2 text-xs">
        <p className="text-slate-200">{t("forms.court.applicantTestifiedQuestion")}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ applicantTestified: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.applicantTestified
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {t("forms.court.noNotSure")}
          </button>
        </div>
      </div>

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
        <p className="text-slate-200">{t("forms.court.restitutionOrderedQuestion")}</p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ restitutionOrdered: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.restitutionOrdered
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
      <div className="space-y-2 text-xs pt-3 border-t border-slate-800">
        <p className="text-slate-200">{t("forms.court.humanTraffickingQuestion")}</p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() =>
              !isReadOnly && onChange({ humanTraffickingCaseFiled: true })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.humanTraffickingCaseFiled
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {t("forms.court.noNotSure")}
          </button>
        </div>

        {court.humanTraffickingCaseFiled && (
          <>
            {/* NEW: Human trafficking testimony question */}
            <div className="space-y-2 pt-2">
              <p className="text-slate-200">
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
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 bg-slate-900 text-slate-300"
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
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 bg-slate-900 text-slate-300"
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
  isReadOnly,
}: {
  losses: LossesClaimed;
  onChange: (patch: Partial<LossesClaimed>) => void;
  isReadOnly: boolean;
}) {
  const { t } = useI18n();

  const toggle = (key: keyof LossesClaimed) => {
    if (isReadOnly) return;
    onChange({ [key]: !losses[key] } as Partial<LossesClaimed>);
  };

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        {t("forms.lossesExtended.title")}
      </h2>

      <p className="text-xs text-slate-300">
        {t("forms.lossesExtended.description")}
      </p>

      <div className="grid gap-4 md:grid-cols-2 text-xs">
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-100">
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
          <h3 className="font-semibold text-slate-100">
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
          <h3 className="font-semibold text-slate-100">
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
          <h3 className="font-semibold text-slate-100">
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

      <p className="text-[11px] text-slate-400">
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
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        {t("forms.medicalExtended.title")}
      </h2>

      <p className="text-xs text-slate-300">
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

      <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
        <p className="text-slate-200">
          {t("forms.medicalExtended.otherSources.question")}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ hasOtherSources: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              medical.hasOtherSources
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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

      <p className="text-[11px] text-slate-400">
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
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        {t("forms.employmentExtended.title")}
      </h2>

      <p className="text-xs text-slate-300">
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

        <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
          <p className="text-slate-200">
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
                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
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
                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
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

      <p className="text-[11px] text-slate-400">
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
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        {t("forms.funeralExtended.title")}
      </h2>

      <p className="text-xs text-slate-300">
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
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-100">
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
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-100">
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
      <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
        <p className="text-slate-200">{t("forms.funeralExtended.esvf.question")}</p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ receivedChicagoESVF: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              funeral.receivedChicagoESVF
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
      <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
        <p className="text-slate-200">
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
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
      <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
        <h3 className="font-semibold text-slate-100">
          {t("forms.funeralExtended.deathBenefits.title")}
        </h3>
        <p className="text-slate-300 text-[11px]">
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
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-100">
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

      <p className="text-[11px] text-slate-400">
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

function SummaryView({
  caseId,
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
  onSaveCase,
}: {
  caseId: string | null;
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
  onSaveCase: () => void;
}) {
  const { t, tf } = useI18n();
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

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

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4 text-sm">
      <h2 className="text-lg font-semibold text-slate-50">
        {t("forms.summary.title")}
      </h2>

      {isReadOnly && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          {t("forms.summary.viewOnlyBanner")}
        </div>
      )}

      <p className="text-xs text-slate-300">{t("forms.summary.description")}</p>

      <div className="grid gap-4 sm:grid-cols-2 text-xs">
        <div className="space-y-1.5">
          <h3 className="font-semibold text-slate-100">
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
          <h3 className="font-semibold text-slate-100">
            {t("forms.summary.sections.applicant")}
          </h3>

          {applicant.isSameAsVictim ? (
            <p className="text-slate-300">{t("forms.summary.applicant.samePerson")}</p>
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
        <h3 className="font-semibold text-slate-100">
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
        <h3 className="font-semibold text-slate-100">
          {t("forms.summary.sections.losses")}
        </h3>
        {selectedLosses.length === 0 ? (
          <p className="text-slate-300">{t("forms.summary.losses.noneSelected")}</p>
        ) : (
          <ul className="list-disc list-inside text-slate-300">
{selectedLosses.map((key) => (
  <li key={key}>{t(`forms.summary.losses.${key}`)}</li>
))}
          </ul>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-slate-100">
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
          <p className="text-slate-300">{t("forms.summary.medical.noneEntered")}</p>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-slate-100">
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
          <p className="text-slate-300">{t("forms.summary.employment.noneEntered")}</p>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-slate-100">
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
              <p className="text-slate-300">{t("forms.summary.funeral.noPayer")}</p>
            )}
          </>
        ) : (
          <p className="text-slate-300">{t("forms.summary.funeral.noneEntered")}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={onDownloadSummaryPdf}
          className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-slate-800 transition"
        >
          {t("forms.summary.actions.downloadSummaryPdf")}
        </button>

        <button
          type="button"
          onClick={onDownloadOfficialIlPdf}
          className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-slate-800 transition"
        >
          {t("forms.summary.actions.downloadOfficialIl")}
        </button>

        {!caseId && !isReadOnly && (
          <button
            type="button"
            onClick={onSaveCase}
            className="inline-flex items-center rounded-lg border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 transition"
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
          className={`inline-flex items-center rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-slate-800 transition ${disBtn}`}
        >
          {t("forms.summary.actions.inviteAdvocate")}
        </button>
      </div>

      {inviteOpen && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-100">
              {t("forms.summary.invite.title")}
            </div>
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            {t("forms.summary.invite.note")}
          </p>

          <label className="block space-y-1">
            <span className="text-slate-300">
              {t("forms.summary.invite.emailLabel")}
            </span>
            <input
              disabled={isReadOnly}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t("forms.summary.invite.emailPlaceholder")}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 disabled:opacity-60"
            />
          </label>

          <label className="flex items-center gap-2 text-slate-300">
            <input
              disabled={isReadOnly}
              type="checkbox"
              checked={inviteCanEdit}
              onChange={(e) => setInviteCanEdit(e.target.checked)}
            />
            {t("forms.summary.invite.canEditLabel")}
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleInvite}
              disabled={isReadOnly || inviteLoading || !inviteEmail.trim()}
              className="rounded-lg bg-[#1C8C8C] px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50 hover:bg-[#21a3a3] transition"
            >
              {inviteLoading
                ? t("forms.summary.invite.sending")
                : t("forms.summary.invite.send")}
            </button>

            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/60 transition"
            >
              {t("ui.buttons.close")}
            </button>
          </div>

          {inviteResult && (
            <pre className="whitespace-pre-wrap text-[11px] text-slate-200 bg-slate-900/60 border border-slate-800 rounded-lg p-2">
{inviteResult}
            </pre>
          )}
        </div>
      )}

      <div className="space-y-1.5 text-xs pt-3 border-t border-slate-800">
        <h3 className="font-semibold text-slate-100">
          {t("forms.summary.certification.title")}
        </h3>

        <div className="space-y-2 mt-2">
          <label className={`flex items-start gap-2 text-[11px] text-slate-200 ${disBtn}`}>
            <input
              disabled={isReadOnly}
              type="checkbox"
              checked={!!certification.acknowledgesSubrogation}
              onChange={(e) =>
                onChangeCertification({ acknowledgesSubrogation: e.target.checked })
              }
              className="mt-[2px] h-3 w-3 rounded border-slate-600 bg-slate-950 text-emerald-400 disabled:opacity-60"
            />
            <span>{t("forms.summary.certification.checks.subrogation")}</span>
          </label>

          <label className={`flex items-start gap-2 text-[11px] text-slate-200 ${disBtn}`}>
            <input
              disabled={isReadOnly}
              type="checkbox"
              checked={!!certification.acknowledgesRelease}
              onChange={(e) =>
                onChangeCertification({ acknowledgesRelease: e.target.checked })
              }
              className="mt-[2px] h-3 w-3 rounded border-slate-600 bg-slate-950 text-emerald-400 disabled:opacity-60"
            />
            <span>{t("forms.summary.certification.checks.release")}</span>
          </label>

          <label className={`flex items-start gap-2 text-[11px] text-slate-200 ${disBtn}`}>
            <input
              disabled={isReadOnly}
              type="checkbox"
              checked={!!certification.acknowledgesPerjury}
              onChange={(e) =>
                onChangeCertification({ acknowledgesPerjury: e.target.checked })
              }
              className="mt-[2px] h-3 w-3 rounded border-slate-600 bg-slate-950 text-emerald-400 disabled:opacity-60"
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
          <p className="text-[11px] text-slate-200">
            {t("forms.summary.certification.attorney.question")}
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => !isReadOnly && onChangeCertification({ representedByAttorney: true })}
              className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                certification.representedByAttorney
                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
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
                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
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
    <label className="block text-xs text-slate-200 space-y-1">
      <span>{label}</span>
      <input
        disabled={disabled}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500
          focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400
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
    <label className="flex items-start gap-2 text-[11px] text-slate-200 cursor-pointer">
      <input
        disabled={disabled}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-[2px] h-3 w-3 rounded border-slate-600 bg-slate-950 text-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
      />
      <span className={disabled ? "opacity-60" : ""}>{label}</span>
    </label>
  );
}

function DocumentsStep({ isReadOnly }: { isReadOnly?: boolean }) {
  const { t } = useI18n();
  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
      <h2 className="text-lg font-semibold text-slate-50">
        {t("forms.documents.stepTitle")}
      </h2>

      {isReadOnly && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          {t("forms.documents.viewOnlyBanner")}
        </div>
      )}

      <p className="text-slate-300">
        {t("forms.documents.intro")}
      </p>

      <ul className="list-disc list-inside text-slate-300 space-y-1">
        <li>{t("forms.documents.bullets.police")}</li>
        <li>{t("forms.documents.bullets.medical")}</li>
        <li>{t("forms.documents.bullets.funeral")}</li>
        <li>{t("forms.documents.bullets.wages")}</li>
        <li>{t("forms.documents.bullets.other")}</li>
      </ul>

      <p className="text-[11px] text-slate-400">
        {t("forms.documents.disclaimer")}
      </p>

      <a
        href={isReadOnly ? undefined : "/compensation/documents"}
        className={`inline-flex items-center rounded-lg px-3 py-1.5 text-[11px] font-semibold transition
          ${
            isReadOnly
              ? "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-400"
              : "border-emerald-500 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
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
            alert("There was an issue uploading that file. Please try again.");
            return;
          }

          const json = await res.json();
          console.log("[UPLOAD] Stored document:", json.document);
        } catch (err) {
          console.error("[UPLOAD] Error uploading document", err);
          alert("Something went wrong uploading that file.");
        }
      })
    );

    // ✅ Clear description after uploads finish
    setDescription("");
  };

  // ✅ IMPORTANT: Component return is OUTSIDE handleFiles
  return (
    <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 text-xs">
      <h3 className="font-semibold text-slate-100">
        {tf("forms.documents.uploader.title", { context: contextLabel })}
      </h3>
      <p className="text-[11px] text-slate-400">
        {t("forms.documents.uploader.helper")}
      </p>

      <div className="grid gap-2 sm:grid-cols-[2fr,3fr]">
        <label className="block text-[11px] text-slate-200 space-y-1">
          <span>{t("forms.documents.uploader.shortDescriptionLabel")}</span>
          <input
            disabled={disabled}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("forms.documents.uploader.shortDescriptionPlaceholder")}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
          />
        </label>

        <label className="block text-[11px] text-slate-200 space-y-1">
          <span>{t("forms.documents.uploader.uploadLabel")}</span>
          <input
            disabled={disabled}
            type="file"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="block w-full text-[11px] text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-slate-950 hover:file:bg-emerald-400"
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
        <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
          <div className="max-w-3xl mx-auto">Loading…</div>
          
        </main>
      }
    >
      <CompensationIntakeInner />
    </Suspense>
  );
}
