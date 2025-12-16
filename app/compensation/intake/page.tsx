"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";

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
  },
  funeral: {
    payments: [],
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
        alert("Could not load that case (no access or not found).");
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

      // ✅ always set active case pointer (don’t rely on userId state)
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (uid) localStorage.setItem(`${ACTIVE_CASE_KEY_PREFIX}${uid}`, caseId);
    } catch (err) {
      console.error("Unexpected error loading case from API:", err);
      alert("Something went wrong loading that case.");
      router.push("/");
    }
  })();
}, [caseId, router]);


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
        setSaveToast("Couldn’t start application. Try refresh.");
        setTimeout(() => setSaveToast(null), 2500);
        return;
      }

      const json = await res.json();
      const newCaseId = json?.case?.id;

      if (!newCaseId) {
        console.error("Auto-create case returned no id:", json);
        setSaveToast("Created, but missing case ID.");
        setTimeout(() => setSaveToast(null), 2500);
        return;
      }

      // ✅ move into case-linked mode
localStorage.setItem(`${ACTIVE_CASE_KEY_PREFIX}${userId}`, newCaseId);
router.replace(`/compensation/intake?case=${newCaseId}`);
      setSaveToast("Application started");
      setTimeout(() => setSaveToast(null), 1500);
      return;
    } catch (e) {
      console.error("Auto-create case error:", e);
      setSaveToast("Couldn’t start application. Try refresh.");
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
const crime = app.crime;
const certification = app.certification;
const court = app.court; // 👈 ADD THIS // 👈 ADD THIS
const losses = app.losses;
const medical = app.medical;
const employment = app.employment; // 👈 ADD THIS
const funeral = app.funeral; // 👈 ADD THIS

const guardPatch =
  <T,>(fn: (patch: Partial<T>) => void) =>
  (patch: Partial<T>) => {
    if (isReadOnly) {
      setSaveToast("View-only access (you can’t edit this case).");
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
      alert("There was an issue generating the PDF. Please try again.");
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
    alert("Something went wrong generating the PDF.");
  }
};

const handleSaveNow = async () => {
  // If this user is viewing a case but can't edit, don't allow saving
  if (caseId && !canEdit) {
    setSaveToast("View-only access. You can’t save changes.");
    setTimeout(() => setSaveToast(null), 2000);
    return;
  }

  // If there is no caseId (shouldn’t happen after “case created on start”),
  // you can either block or fallback. I’m blocking with a clear message:
  if (!caseId) {
    setSaveToast("No case loaded yet. Start the application first.");
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

    setSaveToast("Application saved");
    setTimeout(() => setSaveToast(null), 2000);
  } catch (e) {
    console.error("Save now failed:", e);
    setSaveToast("Couldn’t save. Try again.");
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
      alert(
        "Please fill in the victim's name, date of birth, and address before continuing."
      );
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
      alert(
        "There was an issue generating the official Illinois form. Please try again."
      );
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
    alert("Something went wrong creating the official form.");
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
    alert(
      "Before saving this as a case, please review the certification section and add your name, date, and acknowledgements."
    );
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
      alert("There was a problem saving your case. Please check the console.");
      return;
    }

const json = await res.json();
console.log("Saved case response:", json);

const newCaseId = json?.case?.id;

if (!newCaseId) {
  alert("Saved, but no case ID was returned. Check the API response.");
  return;
}

// ✅ redirect into case-linked mode
router.push(`/compensation/intake?case=${newCaseId}`);
  } catch (err) {
    console.error("Error calling /api/compensation/cases", err);
    alert("Something went wrong saving your case. See console for details.");
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
        }),
      });

      if (!res.ok) {
        console.error("NxtGuide error:", await res.text());
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I had trouble responding just now. Please try again in a moment.",
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
          content:
            "I ran into a technical problem while trying to respond. Please try again shortly.",
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
      alert(
        "Please provide at least the date of the crime, where it happened, and which police department it was reported to."
      );
      return;
    }
    setStep("losses");
    setMaxStepIndex((prev) => Math.max(prev, 3));
  };

  const handleNextFromLosses = () => {
    const anySelected = Object.values(losses).some(Boolean);
    if (!anySelected) {
      const ok = window.confirm(
        "You haven't selected any losses yet. Are you sure you don't want to ask for help with medical, funeral, or other costs?"
      );
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
    const ok = window.confirm(
      "You indicated loss of earnings but haven't entered any employer info yet. Continue anyway?"
    );
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
    const ok = window.confirm(
      "You indicated funeral or burial costs but haven't entered any funeral information yet. Continue anyway?"
    );
    if (!ok) return;
  }

  setStep("summary");
  setMaxStepIndex((prev) => Math.max(prev, 7));
};


const handleBack = () => {
  if (step === "applicant") setStep("victim");
  else if (step === "crime") setStep("applicant");
  else if (step === "losses") setStep("crime");
  else if (step === "medical") setStep("losses");
  else if (step === "employment") setStep("medical");
  else if (step === "funeral") setStep("employment");
  else if (step === "summary") setStep("funeral");
};

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
            Guided Intake · Early Draft
          </p>

          {isReadOnly && (
  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
    View-only access: you can review this case, but you can’t edit or save changes.
  </div>
)}
          <h1 className="text-2xl sm:text-3xl font-bold">
            Tell us about the victim, the incident, and what you need help with
          </h1>
          <p className="text-sm text-slate-300">
            We&apos;ll move slowly through the same sections that appear in the
            Illinois Crime Victims Compensation application, but in plain
            language. You can pause any time.
          </p>

        <p className="text-[11px] text-slate-500">
  Need more context about this program?{" "}
  <a
    href="/knowledge/compensation"
    className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
  >
    Learn how Illinois CVC works.
  </a>
</p>
        </header>

        {/* Step indicator */}
<div className="flex flex-wrap gap-2 text-xs text-slate-300">
<StepBadge label="Victim" active={step === "victim"} onClick={() => setStep("victim")} />
<StepBadge label="Applicant" active={step === "applicant"} onClick={() => setStep("applicant")} />
<StepBadge label="Crime & incident" active={step === "crime"} onClick={() => setStep("crime")} />
<StepBadge label="Losses & money" active={step === "losses"} onClick={() => setStep("losses")} />
<StepBadge label="Medical & counseling" active={step === "medical"} onClick={() => setStep("medical")} />
<StepBadge label="Work & income" active={step === "employment"} onClick={() => setStep("employment")} />
<StepBadge label="Funeral & dependents" active={step === "funeral"} onClick={() => setStep("funeral")} />
<StepBadge label="Documents" active={step === "documents"} onClick={() => setStep("documents")} />
<StepBadge label="Summary" active={step === "summary"} onClick={() => setStep("summary")} />

</div>

        {/* Step content */}
{step === "victim" && (
<VictimForm victim={victim} onChange={updateVictim} isReadOnly={isReadOnly} />
)}

{step === "applicant" && (
<ApplicantForm applicant={applicant} onChange={updateApplicant} isReadOnly={isReadOnly} />
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
    ← Back
  </button>

  <button
    type="button"
    onClick={handleSaveNow}
    disabled={saveNowLoading || !caseId || !canEdit}
    className="text-xs rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
    title={!caseId ? "Creating your case..." : !canEdit ? "View-only access" : ""}
  >
    {saveNowLoading ? "Saving..." : "Save"}
  </button>

  {caseId && canEdit && savingCase && (
    <span className="text-[11px] text-slate-400">Auto-saving…</span>
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
        Continue to Applicant →
      </button>
    )}

    {step === "applicant" && (
      <button
        type="button"
        onClick={handleNextFromApplicant}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
        Continue to Crime Details →
      </button>
    )}

    {step === "crime" && (
      <button
        type="button"
        onClick={handleNextFromCrime}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
        Continue to Losses →
      </button>
    )}

    {step === "losses" && (
      <button
        type="button"
        onClick={handleNextFromLosses}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
        Continue to Medical →
      </button>
    )}

    {step === "medical" && (
      <button
        type="button"
        onClick={handleNextFromMedical}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
        Continue to Work &amp; income →
      </button>
    )}

    {step === "employment" && (
      <button
        type="button"
        onClick={handleNextFromEmployment}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
        Continue to Funeral &amp; dependents →
      </button>
    )}

    {step === "funeral" && (
      <button
        type="button"
        onClick={handleNextFromFuneral}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
        Go to Documents →
      </button>
    )}

    {step === "documents" && (
      <button
        type="button"
        onClick={() => setStep("summary")}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
        Go to Summary →
      </button>
    )}

    {step === "summary" && (
      <button
        type="button"
        onClick={() => setSaveToast("You're already in the final review. Use Save if needed.")}
        className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
        Review complete
      </button>
    )}
  </div>
</div>

        <p className="text-[11px] text-slate-500">
          You are not submitting anything to the state yet. This is preparing a
          draft packet that you can review and send when you are ready.
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
                  Here to help with this step
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
                <p className="text-slate-400">
                  You can ask me things like:
                  <br />
                  • “What is this step about?”
                  <br />
                  • “What happens after I finish this section?”
                  <br />
                  • “What if I don&apos;t have all my documents yet?”
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
                  NxtGuide is typing…
                </p>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="border-t border-slate-800 p-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask NxtGuide about this step..."
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
            Need help on this step?
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
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">Victim information</h2>
      <p className="text-xs text-slate-300">
        This section is about the person who was physically injured or killed. If you
        are that person and over 18, this is your information.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="First name *"
          value={victim.firstName}
          onChange={(v) => onChange({ firstName: v })}
          disabled={isReadOnly}
        />
        <Field
          label="Last name *"
          value={victim.lastName}
          onChange={(v) => onChange({ lastName: v })}
          disabled={isReadOnly}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Date of birth *"
          type="date"
          value={victim.dateOfBirth}
          onChange={(v) => onChange({ dateOfBirth: v })}
          disabled={isReadOnly}
        />
        <Field
          label="Cell phone"
          placeholder="(xxx) xxx-xxxx"
          value={victim.cellPhone ?? ""}
          onChange={(v) => onChange({ cellPhone: v })}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-3">
        <Field
          label="Street address *"
          value={victim.streetAddress}
          onChange={(v) => onChange({ streetAddress: v })}
          disabled={isReadOnly}
        />
        <Field
          label="Apartment / Unit"
          value={victim.apt ?? ""}
          onChange={(v) => onChange({ apt: v })}
          disabled={isReadOnly}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="City *"
            value={victim.city}
            onChange={(v) => onChange({ city: v })}
            disabled={isReadOnly}
          />
          <Field
            label="State *"
            value={victim.state}
            onChange={(v) => onChange({ state: v })}
            disabled={isReadOnly}
          />
          <Field
            label="ZIP code *"
            value={victim.zip}
            onChange={(v) => onChange({ zip: v })}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Email"
          type="email"
          value={victim.email ?? ""}
          onChange={(v) => onChange({ email: v })}
          disabled={isReadOnly}
        />
        <Field
          label="Alternate phone"
          value={victim.alternatePhone ?? ""}
          onChange={(v) => onChange({ alternatePhone: v })}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-800">
        <p className="text-[11px] text-slate-400">
          The following questions are used for civil rights reporting and do not affect
          eligibility. You can skip any that you do not wish to answer.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Gender identity (optional)"
            value={victim.genderIdentity ?? ""}
            onChange={(v) => onChange({ genderIdentity: v })}
            disabled={isReadOnly}
            placeholder="Male, female, non-binary, etc."
          />
          <Field
            label="Race (optional)"
            value={victim.race ?? ""}
            onChange={(v) => onChange({ race: v })}
            disabled={isReadOnly}
            placeholder="e.g. Black, White, Asian, etc."
          />
          <Field
            label="Ethnicity (optional)"
            value={victim.ethnicity ?? ""}
            onChange={(v) => onChange({ ethnicity: v })}
            disabled={isReadOnly}
            placeholder="e.g. Hispanic/Latino, Not Hispanic"
          />
        </div>

        <div className="space-y-2 text-xs">
          <p className="text-slate-200">Does the victim have a disability?</p>

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
              Yes
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
              No
            </button>
          </div>

          {victim.hasDisability && (
            <div className="grid gap-2 sm:grid-cols-4 mt-2">
              {(["physical", "mental", "developmental", "other"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => !isReadOnly && onChange({ disabilityType: t })}
                  className={`px-2 py-1 rounded-full border text-[11px] ${disBtn} ${
                    victim.disabilityType === t
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 bg-slate-900 text-slate-300"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
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
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        Who is filling out this application?
      </h2>
      <p className="text-xs text-slate-300">
        If you are the injured victim and over 18, you are both the victim and the
        applicant. If you are a parent, spouse, or someone who paid bills, you may be
        applying on the victim&apos;s behalf.
      </p>

      <div className="space-y-2 text-xs">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            className="h-3 w-3"
            checked={applicant.isSameAsVictim}
            disabled={isReadOnly}
            onChange={() => !isReadOnly && onChange({ isSameAsVictim: true })}
          />
          <span>I am the victim (my information is the same as above)</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            className="h-3 w-3"
            checked={!applicant.isSameAsVictim}
            disabled={isReadOnly}
            onChange={() => !isReadOnly && onChange({ isSameAsVictim: false })}
          />
          <span>I am applying on behalf of the victim (parent, spouse, other)</span>
        </label>
      </div>

      {!applicant.isSameAsVictim && (
        <div className="space-y-4 pt-3 border-t border-slate-800">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Your first name *"
              value={applicant.firstName ?? ""}
              onChange={(v) => onChange({ firstName: v })}
              disabled={isReadOnly}
            />
            <Field
              label="Your last name *"
              value={applicant.lastName ?? ""}
              onChange={(v) => onChange({ lastName: v })}
              disabled={isReadOnly}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Your date of birth"
              type="date"
              value={applicant.dateOfBirth ?? ""}
              onChange={(v) => onChange({ dateOfBirth: v })}
              disabled={isReadOnly}
            />
            <Field
              label="Relationship to victim"
              placeholder="Parent, spouse, sibling, friend..."
              value={applicant.relationshipToVictim ?? ""}
              onChange={(v) => onChange({ relationshipToVictim: v })}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-3">
            <Field
              label="Your street address"
              value={applicant.streetAddress ?? ""}
              onChange={(v) => onChange({ streetAddress: v })}
              disabled={isReadOnly}
            />
            <Field
              label="Apartment / Unit"
              value={applicant.apt ?? ""}
              onChange={(v) => onChange({ apt: v })}
              disabled={isReadOnly}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="City"
                value={applicant.city ?? ""}
                onChange={(v) => onChange({ city: v })}
                disabled={isReadOnly}
              />
              <Field
                label="State"
                value={applicant.state ?? ""}
                onChange={(v) => onChange({ state: v })}
                disabled={isReadOnly}
              />
              <Field
                label="ZIP code"
                value={applicant.zip ?? ""}
                onChange={(v) => onChange({ zip: v })}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Email"
              type="email"
              value={applicant.email ?? ""}
              onChange={(v) => onChange({ email: v })}
              disabled={isReadOnly}
            />
            <Field
              label="Cell phone"
              value={applicant.cellPhone ?? ""}
              onChange={(v) => onChange({ cellPhone: v })}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
            <p className="text-slate-200">
              If the victim is a minor or an incapacitated adult, do you have legal
              guardianship for them?
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => !isReadOnly && onChange({ hasLegalGuardianship: true })}
                className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                  applicant.hasLegalGuardianship
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                Yes
              </button>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => !isReadOnly && onChange({ hasLegalGuardianship: false })}
                className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                  applicant.hasLegalGuardianship === false
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                No / Not sure
              </button>
            </div>
          </div>
        </div>
      )}
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
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">Crime and incident details</h2>
      <p className="text-xs text-slate-300">
        This section is about what happened. You do not need to remember every detail.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Date of crime *"
          type="date"
          value={crime.dateOfCrime}
          onChange={(v) => onChange({ dateOfCrime: v })}
          disabled={isReadOnly}
        />
        <Field
          label="Date crime was reported"
          type="date"
          value={crime.dateReported}
          onChange={(v) => onChange({ dateReported: v })}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-3">
        <Field
          label="Where did the crime happen? (street address or location) *"
          value={crime.crimeAddress}
          onChange={(v) => onChange({ crimeAddress: v })}
          disabled={isReadOnly}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="City *"
            value={crime.crimeCity}
            onChange={(v) => onChange({ crimeCity: v })}
            disabled={isReadOnly}
          />
          <Field
            label="County"
            value={crime.crimeCounty}
            onChange={(v) => onChange({ crimeCounty: v })}
            disabled={isReadOnly}
          />
          <Field
            label="Police department crime was reported to *"
            placeholder="e.g. Chicago Police Department"
            value={crime.reportingAgency}
            onChange={(v) => onChange({ reportingAgency: v })}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <Field
        label="Police report number (if you have it)"
        value={crime.policeReportNumber ?? ""}
        onChange={(v) => onChange({ policeReportNumber: v })}
        disabled={isReadOnly}
      />

      <Field
        label="Briefly describe what happened"
        placeholder="In your own words, describe the incident."
        value={crime.crimeDescription}
        onChange={(v) => onChange({ crimeDescription: v })}
        disabled={isReadOnly}
      />

      <Field
        label="Briefly describe the injuries"
        placeholder="For example: gunshot wound to leg, surgery, PTSD, etc."
        value={crime.injuryDescription}
        onChange={(v) => onChange({ injuryDescription: v })}
        disabled={isReadOnly}
      />

      <div className="space-y-2 text-xs">
        <p className="text-slate-200">Do you know who did this?</p>

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
            Yes
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ offenderKnown: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              !crime.offenderKnown
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            No / Not sure
          </button>
        </div>
      </div>

      {crime.offenderKnown && (
        <div className="space-y-3">
          <Field
            label="Offender name(s), if known"
            value={crime.offenderNames ?? ""}
            onChange={(v) => onChange({ offenderNames: v })}
            disabled={isReadOnly}
          />
          <Field
            label="Relationship to victim, if any"
            placeholder="Stranger, partner, family member, etc."
            value={crime.offenderRelationship ?? ""}
            onChange={(v) => onChange({ offenderRelationship: v })}
            disabled={isReadOnly}
          />
        </div>
      )}

      <div className="space-y-2 text-xs pt-2 border-t border-slate-800">
        <p className="text-slate-200">
          Was a sexual assault evidence collection kit performed at a hospital?
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ sexualAssaultKitPerformed: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              crime.sexualAssaultKitPerformed
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ sexualAssaultKitPerformed: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              crime.sexualAssaultKitPerformed === false
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            No / Not sure
          </button>
        </div>
      </div>

      <InlineDocumentUploader
        contextLabel="the crime and incident (police reports, witness statements)"
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
  const disBtn = isReadOnly ? "opacity-60 cursor-not-allowed" : "";

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4 mt-4">
      <h2 className="text-lg font-semibold text-slate-50">
        Court & restitution information
      </h2>
      <p className="text-xs text-slate-300">
        If there is a criminal case, you can share what you know. It&apos;s okay
        if you don&apos;t know all of these details — answer what you can.
      </p>

      {/* Arrested */}
      <div className="space-y-2 text-xs">
        <p className="text-slate-200">Was the offender arrested?</p>
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
            Yes
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
            No / Not sure
          </button>
        </div>
      </div>

      {/* Charged */}
      <div className="space-y-2 text-xs">
        <p className="text-slate-200">Has the offender been charged in court?</p>
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
            Yes
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
            No / Not sure
          </button>
        </div>
      </div>

      {/* Testified */}
      <div className="space-y-2 text-xs">
        <p className="text-slate-200">
          Have you been required to testify in the criminal case?
        </p>
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
            Yes
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
            No / Not sure
          </button>
        </div>
      </div>

      <Field
        label="Criminal case number (if known)"
        value={court.criminalCaseNumber ?? ""}
        onChange={(v) => onChange({ criminalCaseNumber: v })}
        disabled={isReadOnly}
      />

      <Field
        label="What was the outcome of the criminal case? (if known)"
        placeholder="For example: convicted, case dismissed, plea deal, still pending..."
        value={court.criminalCaseOutcome ?? ""}
        onChange={(v) => onChange({ criminalCaseOutcome: v })}
        disabled={isReadOnly}
      />

      {/* Restitution */}
      <div className="space-y-2 text-xs">
        <p className="text-slate-200">
          Has the court ordered the offender to pay restitution (money directly
          to you or on your behalf)?
        </p>

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
            Yes
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
            No / Not sure
          </button>
        </div>

        {court.restitutionOrdered && (
          <Field
            label="If yes, how much (approximate)?"
            placeholder="For example: 5000"
            value={court.restitutionAmount?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                restitutionAmount: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
              })
            }
            disabled={isReadOnly}
          />
        )}
      </div>

      {/* Human trafficking */}
      <div className="space-y-2 text-xs pt-3 border-t border-slate-800">
        <p className="text-slate-200">
          Has the offender been involved in a human trafficking court proceeding related to this incident?
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ humanTraffickingCaseFiled: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.humanTraffickingCaseFiled
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ humanTraffickingCaseFiled: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              court.humanTraffickingCaseFiled === false
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            No / Not sure
          </button>
        </div>

        {court.humanTraffickingCaseFiled && (
          <>
            <Field
              label="Human trafficking case number (if known)"
              value={court.humanTraffickingCaseNumber ?? ""}
              onChange={(v) => onChange({ humanTraffickingCaseNumber: v })}
              disabled={isReadOnly}
            />
            <Field
              label="Outcome of the human trafficking case (if known)"
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
  const toggle = (key: keyof LossesClaimed) => {
    if (isReadOnly) return;
    onChange({ [key]: !losses[key] } as Partial<LossesClaimed>);
  };

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        What do you need help paying for?
      </h2>
      <p className="text-xs text-slate-300">
        This section lists the types of expenses and losses that may be covered
        by Crime Victims Compensation. Choose everything that applies.
      </p>

      <div className="grid gap-4 md:grid-cols-2 text-xs">
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-100">
            Medical, counseling, basic needs
          </h3>
          <Checkbox
            label="Medical / hospital bills"
            checked={losses.medicalHospital}
            onChange={() => toggle("medicalHospital")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Dental care"
            checked={losses.dental}
            onChange={() => toggle("dental")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Counseling / therapy"
            checked={losses.counseling}
            onChange={() => toggle("counseling")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Transportation to medical or court"
            checked={losses.transportation}
            onChange={() => toggle("transportation")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Accessibility costs (wheelchair ramps, etc.)"
            checked={losses.accessibilityCosts}
            onChange={() => toggle("accessibilityCosts")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Temporary lodging / hotel"
            checked={losses.temporaryLodging}
            onChange={() => toggle("temporaryLodging")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Relocation costs (moving for safety)"
            checked={losses.relocationCosts}
            onChange={() => toggle("relocationCosts")}
            disabled={isReadOnly}
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-slate-100">
            Work, income, and support
          </h3>
          <Checkbox
            label="Loss of earnings (missed work)"
            checked={losses.lossOfEarnings}
            onChange={() => toggle("lossOfEarnings")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Loss of support to dependents"
            checked={losses.lossOfSupport}
            onChange={() => toggle("lossOfSupport")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Loss of future earnings"
            checked={losses.lossOfFutureEarnings}
            onChange={() => toggle("lossOfFutureEarnings")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Replacement service loss (services victim used to provide)"
            checked={losses.replacementServiceLoss}
            onChange={() => toggle("replacementServiceLoss")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Tuition / school-related costs"
            checked={losses.tuition}
            onChange={() => toggle("tuition")}
            disabled={isReadOnly}
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-slate-100">
            Funeral, burial, and property
          </h3>
          <Checkbox
            label="Funeral / burial / cremation"
            checked={losses.funeralBurial}
            onChange={() => toggle("funeralBurial")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Headstone"
            checked={losses.headstone}
            onChange={() => toggle("headstone")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Crime scene cleanup"
            checked={losses.crimeSceneCleanup}
            onChange={() => toggle("crimeSceneCleanup")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Towing and storage of vehicle"
            checked={losses.towingStorage}
            onChange={() => toggle("towingStorage")}
            disabled={isReadOnly}
          />

          <Checkbox
            label="Doors, locks, windows (security repairs)"
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
            Personal items & other
          </h3>

          <Checkbox
            label="Clothing or bedding taken as evidence"
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
            label="Prosthetic appliances, eyeglasses, hearing aids"
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
            label="Replacement costs for necessary items"
            checked={losses.replacementCosts}
            onChange={() => toggle("replacementCosts")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Legal fees"
            checked={losses.legalFees}
            onChange={() => toggle("legalFees")}
            disabled={isReadOnly}
          />
          <Checkbox
            label="Tattoo removal (human trafficking cases)"
            checked={losses.tattooRemoval}
            onChange={() => toggle("tattooRemoval")}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        Choosing an item here does not guarantee payment, but it tells the program what you are asking to be considered.
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
        Medical, dental, and counseling bills
      </h2>
      <p className="text-xs text-slate-300">
        If you are asking for help with medical, dental, hospital, or counseling bills,
        you can list at least one provider here.
      </p>

      <div className="space-y-3">
        <Field
          label="Main hospital / clinic / therapist name"
          value={primary.providerName}
          onChange={(v) => updatePrimary({ providerName: v })}
          disabled={isReadOnly}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="City"
            value={primary.city || ""}
            onChange={(v) => updatePrimary({ city: v })}
            disabled={isReadOnly}
          />
          <Field
            label="Provider phone"
            value={primary.phone || ""}
            onChange={(v) => updatePrimary({ phone: v })}
            disabled={isReadOnly}
          />
          <Field
            label="Dates of service (if known)"
            value={primary.serviceDates || ""}
            onChange={(v) => updatePrimary({ serviceDates: v })}
            disabled={isReadOnly}
          />
        </div>

        <Field
          label="Approximate total amount of this bill"
          placeholder="For example: 2500"
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
          Do you have health insurance, public aid, or other programs that may pay some of these bills?
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
            Yes
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
            No / Not sure
          </button>
        </div>

        {medical.hasOtherSources && (
          <Field
            label="Briefly list any insurance or programs (Medical Card, Medicare, private insurance, etc.)"
            value={medical.otherInsuranceDescription || ""}
            onChange={(v) =>
              !isReadOnly && onChange({ otherInsuranceDescription: v })
            }
            disabled={isReadOnly}
          />
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        In a later version, we&apos;ll let you add more providers here, or your advocate can attach a full list.
      </p>

      <InlineDocumentUploader
        contextLabel="medical and counseling bills"
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
        Work & income (loss of earnings)
      </h2>
      <p className="text-xs text-slate-300">
        If you missed work because of the crime, the program may consider paying for some of that lost income.
      </p>

      <div className="space-y-3">
        <Field
          label="Employer name"
          value={record.employerName}
          onChange={(v) => updateRecord({ employerName: v })}
          disabled={isReadOnly}
        />

        <Field
          label="Employer address"
          value={record.employerAddress ?? ""}
          onChange={(v) => updateRecord({ employerAddress: v })}
          disabled={isReadOnly}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Employer phone"
            value={record.employerPhone ?? ""}
            onChange={(v) => updateRecord({ employerPhone: v })}
            disabled={isReadOnly}
          />

          <Field
            label="Your net monthly wages (take-home pay)"
            placeholder="For example: 2200"
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
            After the crime, did you receive sick time, vacation, disability, or other paid benefits?
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() =>
                !isReadOnly &&
                onChange({ receivedSickOrVacationOrDisability: true })
              }
              className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                employment.receivedSickOrVacationOrDisability
                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              Yes
            </button>

            <button
              type="button"
              disabled={isReadOnly}
              onClick={() =>
                !isReadOnly &&
                onChange({ receivedSickOrVacationOrDisability: false })
              }
              className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
                employment.receivedSickOrVacationOrDisability === false
                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              No / Not sure
            </button>
          </div>

          {employment.receivedSickOrVacationOrDisability && (
            <Field
              label="If you remember, briefly describe (for example: 2 weeks sick pay, 3 days vacation)..."
              value={employment.benefitNotes || ""}
              onChange={(v) => !isReadOnly && onChange({ benefitNotes: v })}
              disabled={isReadOnly}
            />
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        In a later version, you&apos;ll be able to add more jobs and more detail here.
      </p>

      <InlineDocumentUploader
        contextLabel="work and income (pay stubs, employer letters)"
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

  // dependent helper
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
        Funeral, burial, and dependents
      </h2>
      <p className="text-xs text-slate-300">
        If the victim died as a result of the crime, this program may help with funeral,
        burial, or cremation costs. You can enter basic information here.
      </p>

      <div className="space-y-3">
        <Field
          label="Funeral home name"
          value={funeral.funeralHomeName ?? ""}
          onChange={(v) => onChange({ funeralHomeName: v })}
          disabled={isReadOnly}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Funeral home phone"
            value={funeral.funeralHomePhone ?? ""}
            onChange={(v) => onChange({ funeralHomePhone: v })}
            disabled={isReadOnly}
          />
          <Field
            label="Total funeral bill (approximate)"
            placeholder="For example: 8000"
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

      <div className="space-y-3 pt-3 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-100">
          Cemetery information
        </h3>
        <Field
          label="Name of cemetery"
          value={funeral.cemeteryName ?? ""}
          onChange={(v) => onChange({ cemeteryName: v })}
          disabled={isReadOnly}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Cemetery phone"
            value={funeral.cemeteryPhone ?? ""}
            onChange={(v) => onChange({ cemeteryPhone: v })}
            disabled={isReadOnly}
          />
          <Field
            label="Total cemetery bill (approximate)"
            placeholder="For example: 2000"
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

      <div className="space-y-3 pt-3 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-100">
          Who has paid or will pay these costs?
        </h3>

        <div className="space-y-3">
          <Field
            label="Name of person paying"
            value={primaryPayment.payerName}
            onChange={(v) => updatePrimaryPayment({ payerName: v })}
            disabled={isReadOnly}
          />
          <Field
            label="Relationship to victim"
            placeholder="Parent, spouse, sibling, friend..."
            value={primaryPayment.relationshipToVictim ?? ""}
            onChange={(v) => updatePrimaryPayment({ relationshipToVictim: v })}
            disabled={isReadOnly}
          />
          <Field
            label="Amount paid so far (approximate)"
            placeholder="For example: 2000"
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

      <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
        <p className="text-slate-200">
          Did you receive money from the City of Chicago ESVF for funeral expenses?
        </p>
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
            Yes
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
            No / Not sure
          </button>
        </div>

        {funeral.receivedChicagoESVF && (
          <Field
            label="How much did ESVF pay? (approximate)"
            placeholder="For example: 1500"
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

      <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
        <p className="text-slate-200">
          Did the victim have a life insurance policy that paid out after their death?
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ lifeInsurancePolicyExists: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              funeral.lifeInsurancePolicyExists
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && onChange({ lifeInsurancePolicyExists: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${disBtn} ${
              funeral.lifeInsurancePolicyExists === false
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            No / Not sure
          </button>
        </div>

        {funeral.lifeInsurancePolicyExists && (
          <div className="space-y-2">
            <Field
              label="Life insurance company"
              value={funeral.lifeInsuranceCompany ?? ""}
              onChange={(v) => onChange({ lifeInsuranceCompany: v })}
              disabled={isReadOnly}
            />
            <Field
              label="Name of beneficiary"
              value={funeral.lifeInsuranceBeneficiary ?? ""}
              onChange={(v) => onChange({ lifeInsuranceBeneficiary: v })}
              disabled={isReadOnly}
            />
            <Field
              label="Beneficiary phone"
              value={funeral.lifeInsuranceBeneficiaryPhone ?? ""}
              onChange={(v) => onChange({ lifeInsuranceBeneficiaryPhone: v })}
              disabled={isReadOnly}
            />
            <Field
              label="Amount paid (approximate)"
              placeholder="For example: 10000"
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

      <div className="space-y-3 pt-3 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-100">
          Dependents who relied on the victim&apos;s income
        </h3>

        <div className="space-y-3">
          <Field
            label="Dependent name"
            value={dep.name}
            onChange={(v) => updateDep({ name: v })}
            disabled={isReadOnly}
          />
          <Field
            label="Relationship to victim"
            placeholder="Child, spouse, partner, etc."
            value={dep.relationshipToVictim ?? ""}
            onChange={(v) => updateDep({ relationshipToVictim: v })}
            disabled={isReadOnly}
          />
          <Field
            label="Dependent date of birth"
            type="date"
            value={dep.dateOfBirth ?? ""}
            onChange={(v) => updateDep({ dateOfBirth: v })}
            disabled={isReadOnly}
          />
          <Field
            label="Guardian name & phone (if minor)"
            value={dep.guardianNamePhone ?? ""}
            onChange={(v) => updateDep({ guardianNamePhone: v })}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        In a later version, you&apos;ll be able to add each dependent here and link them
        to loss-of-support claims.
      </p>

      <InlineDocumentUploader
        contextLabel="funeral, burial, and dependents"
        defaultDocType="funeral_bill"
        disabled={isReadOnly}
      />
    </section>
  );
}

function SummaryView({
  caseId,
  isReadOnly, // ✅ NEW
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
  isReadOnly: boolean; // ✅ NEW
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
        setInviteResult(
          "Save this as a case first so we can generate a secure invite link."
        );
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setInviteResult("You must be logged in to invite an advocate.");
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
        setInviteResult(text);
        return;
      }

      const json = JSON.parse(text);
      setInviteResult(
        `✅ Access granted.\nShare this link with the advocate:\n${json.shareUrl}`
      );
    } catch (e: any) {
      setInviteResult(e?.message || "Unexpected error inviting advocate.");
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
      <h2 className="text-lg font-semibold text-slate-50">Quick summary</h2>

      {isReadOnly && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          View-only access: you can review this case, but you can’t edit fields,
          certification, or invites.
        </div>
      )}

      <p className="text-xs text-slate-300">
        This is a quick snapshot of what you&apos;ve entered so far.
      </p>

      {/* snapshot blocks (unchanged) */}
      <div className="grid gap-4 sm:grid-cols-2 text-xs">
        <div className="space-y-1.5">
          <h3 className="font-semibold text-slate-100">Victim</h3>
          <p>
            {victim.firstName} {victim.lastName}
          </p>
          <p>DOB: {victim.dateOfBirth || "—"}</p>
          <p>
            {victim.streetAddress}
            {victim.apt ? `, ${victim.apt}` : ""}
          </p>
          <p>
            {victim.city}, {victim.state} {victim.zip}
          </p>
          <p>Cell: {victim.cellPhone || "—"}</p>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-slate-100">Applicant</h3>
          {applicant.isSameAsVictim ? (
            <p className="text-slate-300">
              Victim and applicant are the same person.
            </p>
          ) : (
            <>
              <p>
                {applicant.firstName} {applicant.lastName}
              </p>
              <p>
                Relationship: {applicant.relationshipToVictim || "Not provided"}
              </p>
              <p>Email: {applicant.email || "—"}</p>
              <p>Cell: {applicant.cellPhone || "—"}</p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-slate-100">Crime snapshot</h3>
        <p>Date of crime: {crime.dateOfCrime || "—"}</p>
        <p>Location: {crime.crimeAddress || "—"}</p>
        <p>
          City / County: {crime.crimeCity || "—"}
          {crime.crimeCounty ? ` (${crime.crimeCounty})` : ""}
        </p>
        <p>Reported to: {crime.reportingAgency || "—"}</p>
        <p>Police report #: {crime.policeReportNumber || "—"}</p>
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-slate-100">Losses</h3>
        {selectedLosses.length === 0 ? (
          <p className="text-slate-300">No losses selected yet.</p>
        ) : (
          <ul className="list-disc list-inside text-slate-300">
            {selectedLosses.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-slate-100">Medical snapshot</h3>
        {primaryProvider?.providerName ? (
          <>
            <p>Provider: {primaryProvider.providerName}</p>
            <p>
              City / Phone: {primaryProvider.city || "—"}{" "}
              {primaryProvider.phone ? ` / ${primaryProvider.phone}` : ""}
            </p>
            <p>Dates of service: {primaryProvider.serviceDates || "—"}</p>
            <p>
              Approx. bill amount:{" "}
              {primaryProvider.amountOfBill != null
                ? `$${primaryProvider.amountOfBill}`
                : "—"}
            </p>
          </>
        ) : (
          <p className="text-slate-300">No medical provider entered yet.</p>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-slate-100">Work snapshot</h3>
        {primaryJob?.employerName ? (
          <>
            <p>Employer: {primaryJob.employerName}</p>
            <p>Employer phone: {primaryJob.employerPhone || "—"}</p>
            <p>
              Net monthly wages:{" "}
              {primaryJob.netMonthlyWages != null
                ? `$${primaryJob.netMonthlyWages}`
                : "—"}
            </p>
          </>
        ) : (
          <p className="text-slate-300">No work info entered yet.</p>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-slate-100">Funeral snapshot</h3>
        {funeral.funeralHomeName || funeral.funeralBillTotal ? (
          <>
            <p>Funeral home: {funeral.funeralHomeName || "—"}</p>
            <p>Funeral home phone: {funeral.funeralHomePhone || "—"}</p>
            <p>
              Total funeral bill:{" "}
              {funeral.funeralBillTotal != null
                ? `$${funeral.funeralBillTotal}`
                : "—"}
            </p>
            {primaryFuneralPayer?.payerName ? (
              <>
                <p>
                  Payer: {primaryFuneralPayer.payerName} (
                  {primaryFuneralPayer.relationshipToVictim ||
                    "relationship not set"}
                  )
                </p>
                <p>
                  Amount paid so far:{" "}
                  {primaryFuneralPayer.amountPaid != null
                    ? `$${primaryFuneralPayer.amountPaid}`
                    : "—"}
                </p>
              </>
            ) : (
              <p className="text-slate-300">No payer entered yet.</p>
            )}
          </>
        ) : (
          <p className="text-slate-300">No funeral info entered yet.</p>
        )}
      </div>

      {/* actions */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={onDownloadSummaryPdf}
          className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-slate-800 transition"
        >
          Download summary PDF
        </button>

        <button
          type="button"
          onClick={onDownloadOfficialIlPdf}
          className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-slate-800 transition"
        >
          Download official Illinois CVC form
        </button>

        {!caseId && !isReadOnly && (
          <button
            type="button"
            onClick={onSaveCase}
            className="inline-flex items-center rounded-lg border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 transition"
          >
            Save as case for advocate review
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
          Invite advocate
        </button>
      </div>

      {/* invite panel */}
      {inviteOpen && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-100">Invite an advocate</div>
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            The advocate must already have an account using this email.
          </p>

          <label className="block space-y-1">
            <span className="text-slate-300">Advocate email</span>
            <input
              disabled={isReadOnly}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="advocate@example.com"
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
            Allow this advocate to edit
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleInvite}
              disabled={isReadOnly || inviteLoading || !inviteEmail.trim()}
              className={`rounded-lg bg-[#1C8C8C] px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50 hover:bg-[#21a3a3] transition`}
            >
              {inviteLoading ? "Inviting…" : "Send invite"}
            </button>

            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/60 transition"
            >
              Close
            </button>
          </div>

          {inviteResult && (
            <pre className="whitespace-pre-wrap text-[11px] text-slate-200 bg-slate-900/60 border border-slate-800 rounded-lg p-2">
{inviteResult}
            </pre>
          )}
        </div>
      )}

      {/* certification */}
      <div className="space-y-1.5 text-xs pt-3 border-t border-slate-800">
        <h3 className="font-semibold text-slate-100">Certification & authorization</h3>

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
            <span>…subrogation acknowledgement…</span>
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
            <span>…release acknowledgement…</span>
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
            <span>…perjury acknowledgement…</span>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          <Field
            label="Applicant signature (type your full name)"
            value={certification.applicantSignatureName ?? ""}
            onChange={(v) => onChangeCertification({ applicantSignatureName: v })}
            disabled={isReadOnly}
          />
          <Field
            label="Date"
            type="date"
            value={certification.applicantSignatureDate ?? ""}
            onChange={(v) => onChangeCertification({ applicantSignatureDate: v })}
            disabled={isReadOnly}
          />
        </div>

        {/* represented by attorney */}
        <div className="space-y-2 mt-3">
          <p className="text-[11px] text-slate-200">
            Are you being represented by an attorney?
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
              Yes
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
              No
            </button>
          </div>

          {certification.representedByAttorney && (
            <div className="grid gap-3 sm:grid-cols-2 mt-2">
              <Field
                label="Attorney name"
                value={certification.attorneyName ?? ""}
                onChange={(v) => onChangeCertification({ attorneyName: v })}
                disabled={isReadOnly}
              />
              <Field
                label="ARDC number (if known)"
                value={certification.attorneyArdc ?? ""}
                onChange={(v) => onChangeCertification({ attorneyArdc: v })}
                disabled={isReadOnly}
              />
              <Field
                label="Attorney address"
                value={certification.attorneyAddress ?? ""}
                onChange={(v) => onChangeCertification({ attorneyAddress: v })}
                disabled={isReadOnly}
              />
              <Field
                label="City"
                value={certification.attorneyCity ?? ""}
                onChange={(v) => onChangeCertification({ attorneyCity: v })}
                disabled={isReadOnly}
              />
              <Field
                label="State"
                value={certification.attorneyState ?? ""}
                onChange={(v) => onChangeCertification({ attorneyState: v })}
                disabled={isReadOnly}
              />
              <Field
                label="ZIP"
                value={certification.attorneyZip ?? ""}
                onChange={(v) => onChangeCertification({ attorneyZip: v })}
                disabled={isReadOnly}
              />
              <Field
                label="Phone"
                value={certification.attorneyPhone ?? ""}
                onChange={(v) => onChangeCertification({ attorneyPhone: v })}
                disabled={isReadOnly}
              />
              <Field
                label="Email"
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
  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
      <h2 className="text-lg font-semibold text-slate-50">
        Upload police reports, bills, and other documents
      </h2>

      {isReadOnly && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          View-only access: you can review this section, but only the case owner
          can upload or modify documents.
        </div>
      )}

      <p className="text-slate-300">
        Supporting documents help the Attorney General&apos;s office understand
        your case and verify the costs you&apos;re asking to be covered.
        You can upload:
      </p>

      <ul className="list-disc list-inside text-slate-300 space-y-1">
        <li>Police reports or incident numbers</li>
        <li>Hospital and medical bills</li>
        <li>Funeral and cemetery invoices</li>
        <li>Pay stubs or letters from employers</li>
        <li>Any other proof of expenses related to the crime</li>
      </ul>

      <p className="text-[11px] text-slate-400">
        Uploading documents does not submit your application. You&apos;ll have a
        chance to review everything on the Summary page before sending anything
        to the state.
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
        Go to document upload page →
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
        Attach documents related to {contextLabel}
      </h3>
      <p className="text-[11px] text-slate-400">
        These uploads are optional, but they can help the Attorney General&apos;s
        office review this part of your application more quickly.
      </p>

      <div className="grid gap-2 sm:grid-cols-[2fr,3fr]">
        <label className="block text-[11px] text-slate-200 space-y-1">
          <span>Short description (optional)</span>
          <input
            disabled={disabled}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Police report from CPD, case #..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
          />
        </label>

        <label className="block text-[11px] text-slate-200 space-y-1">
          <span>Upload file(s)</span>
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
