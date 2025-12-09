"use client";

import { useState, useEffect } from "react"; // 👈 ADD useEffect

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
  | "summary";

const STORAGE_KEY = "nxtstps_compensation_intake_v1"; // 👈 HERE

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

export default function CompensationIntakePage() {
  const [step, setStep] = useState<IntakeStep>("victim");
  // 0=victim,1=applicant,2=crime,3=losses,4=medical,5=employment,6=funeral,7=summary
  const [maxStepIndex, setMaxStepIndex] = useState(0);
  const [app, setApp] = useState<CompensationApplication>(
    makeEmptyApplication()
  );

  // Load saved intake on first mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        app?: CompensationApplication;
        step?: IntakeStep;
        maxStepIndex?: number;
      };

      if (parsed.app) {
        setApp(parsed.app);
      }
      if (parsed.step) {
        setStep(parsed.step);
      }
      if (typeof parsed.maxStepIndex === "number") {
        setMaxStepIndex(parsed.maxStepIndex);
      }
    } catch (err) {
      console.error("Failed to load compensation intake from localStorage", err);
    }
  }, []);

    // Save whenever the application or step changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const payload = {
        app,
        step,
        maxStepIndex,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error("Failed to save compensation intake to localStorage", err);
    }
  }, [app, step, maxStepIndex]);

const victim = app.victim;
const applicant = app.applicant;
const crime = app.crime;
const certification = app.certification;
const court = app.court; // 👈 ADD THIS // 👈 ADD THIS
const losses = app.losses;
const medical = app.medical;
const employment = app.employment; // 👈 ADD THIS
const funeral = app.funeral; // 👈 ADD THIS

  const updateVictim = (patch: Partial<VictimInfo>) => {
    setApp((prev) => ({ ...prev, victim: { ...prev.victim, ...patch } }));
  };

  const updateApplicant = (patch: Partial<ApplicantInfo>) => {
    setApp((prev) => ({
      ...prev,
      applicant: { ...prev.applicant, ...patch },
    }));
  };

  const updateCrime = (patch: Partial<CrimeInfo>) => {
    setApp((prev) => ({
      ...prev,
      crime: { ...prev.crime, ...patch },
    }));
  };

  const updateLosses = (patch: Partial<LossesClaimed>) => {
    setApp((prev) => ({
      ...prev,
      losses: { ...prev.losses, ...patch },
    }));
  };

  const updateCourt = (patch: Partial<CourtInfo>) => {
  setApp((prev) => ({
    ...prev,
    court: { ...prev.court, ...patch },
  }));
};

  const updateMedical = (patch: Partial<MedicalInfo>) => {
    setApp((prev) => ({
      ...prev,
      medical: { ...prev.medical, ...patch },
    }));
  };

  const updateCertification = (patch: Partial<CertificationInfo>) => {
  setApp((prev) => ({
    ...prev,
    certification: { ...prev.certification, ...patch },
  }));
};

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

  const handleNextFromApplicant = () => {
    if (applicant.isSameAsVictim) {
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

  const updateEmployment = (patch: Partial<EmploymentInfo>) => {
  setApp((prev) => ({
    ...prev,
    employment: { ...prev.employment, ...patch },
  }));
};

const updateFuneral = (patch: Partial<FuneralInfo>) => {
  setApp((prev) => ({
    ...prev,
    funeral: { ...prev.funeral, ...patch },
  }));
};

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
            Guided Intake · Early Draft
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Tell us about the victim, the incident, and what you need help with
          </h1>
          <p className="text-sm text-slate-300">
            We&apos;ll move slowly through the same sections that appear in the
            Illinois Crime Victims Compensation application, but in plain
            language. You can pause any time.
          </p>
        </header>

        {/* Step indicator */}
<div className="flex flex-wrap gap-2 text-xs text-slate-300">
  <StepBadge
    label="Victim"
    active={step === "victim"}
    disabled={false}
    onClick={() => setStep("victim")}
  />
  <StepBadge
    label="Applicant"
    active={step === "applicant"}
    disabled={maxStepIndex < 1}
    onClick={() => maxStepIndex >= 1 && setStep("applicant")}
  />
  <StepBadge
    label="Crime & incident"
    active={step === "crime"}
    disabled={maxStepIndex < 2}
    onClick={() => maxStepIndex >= 2 && setStep("crime")}
  />
  <StepBadge
    label="Losses & money"
    active={step === "losses"}
    disabled={maxStepIndex < 3}
    onClick={() => maxStepIndex >= 3 && setStep("losses")}
  />
<StepBadge
  label="Medical & counseling"
  active={step === "medical"}
  disabled={maxStepIndex < 4}
  onClick={() => maxStepIndex >= 4 && setStep("medical")}
/>
<StepBadge
  label="Work & income"
  active={step === "employment"}
  disabled={maxStepIndex < 5}
  onClick={() => maxStepIndex >= 5 && setStep("employment")}
/>
<StepBadge
  label="Funeral & dependents"
  active={step === "funeral"}
  disabled={maxStepIndex < 6}
  onClick={() => maxStepIndex >= 6 && setStep("funeral")}
/>
<StepBadge
  label="Summary"
  active={step === "summary"}
  disabled={maxStepIndex < 7}
  onClick={() => maxStepIndex >= 7 && setStep("summary")}
/>
</div>

        {/* Step content */}
{step === "victim" && (
  <VictimForm victim={victim} onChange={updateVictim} />
)}

{step === "applicant" && (
  <ApplicantForm applicant={applicant} onChange={updateApplicant} />
)}

{step === "crime" && (
  <>
    <CrimeForm crime={crime} onChange={updateCrime} />
    <CourtForm court={court} onChange={updateCourt} />
  </>
)}

{step === "losses" && (
  <LossesForm losses={losses} onChange={updateLosses} />
)}

{step === "medical" && (
  <MedicalForm medical={medical} onChange={updateMedical} />
)}

{step === "employment" && (
  <EmploymentForm employment={employment} onChange={updateEmployment} />
)}

{step === "funeral" && (
  <FuneralForm funeral={funeral} onChange={updateFuneral} />
)}

{step === "summary" && (
  <SummaryView
    victim={victim}
    applicant={applicant}
    crime={crime}
    losses={losses}
    medical={medical}
    employment={employment}
    funeral={funeral}
    certification={certification}               // 👈 ADD
    onChangeCertification={updateCertification}
    onDownloadSummaryPdf={handleDownloadPdf}  // 👈 ADD
  />
)}

        {/* Nav buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === "victim"}
            className="text-xs rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-900 transition"
          >
            ← Back
          </button>

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
    Continue to Work & income →
  </button>
)}

{step === "employment" && (
  <button
    type="button"
    onClick={handleNextFromEmployment}
    className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
  >
    Continue to Funeral & dependents →
  </button>
)}

{step === "funeral" && (
  <button
    type="button"
    onClick={handleNextFromFuneral}
    className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
  >
    Review Summary →
  </button>
)}

{step === "summary" && (
  <button
    type="button"
    onClick={() =>
      alert("Next (future phase): document upload and PDF generation.")
    }
    className="text-xs rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition"
  >
    Looks good – continue
  </button>
)}
        </div>

        <p className="text-[11px] text-slate-500">
          You are not submitting anything to the state yet. This is preparing a
          draft packet that you can review and send when you are ready.
        </p>
      </div>
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
}: {
  victim: VictimInfo;
  onChange: (patch: Partial<VictimInfo>) => void;
}) {
  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        Victim information
      </h2>
      <p className="text-xs text-slate-300">
        This section is about the person who was physically injured or killed.
        If you are that person and over 18, this is your information.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="First name *"
          value={victim.firstName}
          onChange={(v) => onChange({ firstName: v })}
        />
        <Field
          label="Last name *"
          value={victim.lastName}
          onChange={(v) => onChange({ lastName: v })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Date of birth *"
          type="date"
          value={victim.dateOfBirth}
          onChange={(v) => onChange({ dateOfBirth: v })}
        />
        <Field
          label="Cell phone"
          placeholder="(xxx) xxx-xxxx"
          value={victim.cellPhone ?? ""}
          onChange={(v) => onChange({ cellPhone: v })}
        />
      </div>

      <div className="space-y-3">
        <Field
          label="Street address *"
          value={victim.streetAddress}
          onChange={(v) => onChange({ streetAddress: v })}
        />
        <Field
          label="Apartment / Unit"
          value={victim.apt ?? ""}
          onChange={(v) => onChange({ apt: v })}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="City *"
            value={victim.city}
            onChange={(v) => onChange({ city: v })}
          />
          <Field
            label="State *"
            value={victim.state}
            onChange={(v) => onChange({ state: v })}
          />
          <Field
            label="ZIP code *"
            value={victim.zip}
            onChange={(v) => onChange({ zip: v })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Email"
          type="email"
          value={victim.email ?? ""}
          onChange={(v) => onChange({ email: v })}
        />
        <Field
          label="Alternate phone"
          value={victim.alternatePhone ?? ""}
          onChange={(v) => onChange({ alternatePhone: v })}
        />
      </div>

            <div className="space-y-3 pt-3 border-t border-slate-800">
        <p className="text-[11px] text-slate-400">
          The following questions are used for civil rights reporting and do
          not affect eligibility. You can skip any that you do not wish to
          answer.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Gender identity (optional)"
            value={victim.genderIdentity ?? ""}
            onChange={(v) => onChange({ genderIdentity: v })}
            placeholder="Male, female, non-binary, etc."
          />
          <Field
            label="Race (optional)"
            value={victim.race ?? ""}
            onChange={(v) => onChange({ race: v })}
            placeholder="e.g. Black, White, Asian, etc."
          />
          <Field
            label="Ethnicity (optional)"
            value={victim.ethnicity ?? ""}
            onChange={(v) => onChange({ ethnicity: v })}
            placeholder="e.g. Hispanic/Latino, Not Hispanic"
          />
        </div>

        <div className="space-y-2 text-xs">
          <p className="text-slate-200">Does the victim have a disability?</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onChange({ hasDisability: true })}
              className={`px-3 py-1 rounded-full border text-[11px] ${
                victim.hasDisability
                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({ hasDisability: false, disabilityType: null })
              }
              className={`px-3 py-1 rounded-full border text-[11px] ${
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
              <button
                type="button"
                onClick={() => onChange({ disabilityType: "physical" })}
                className={`px-2 py-1 rounded-full border text-[11px] ${
                  victim.disabilityType === "physical"
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                Physical
              </button>
              <button
                type="button"
                onClick={() => onChange({ disabilityType: "mental" })}
                className={`px-2 py-1 rounded-full border text-[11px] ${
                  victim.disabilityType === "mental"
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                Mental
              </button>
              <button
                type="button"
                onClick={() => onChange({ disabilityType: "developmental" })}
                className={`px-2 py-1 rounded-full border text-[11px] ${
                  victim.disabilityType === "developmental"
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                Developmental
              </button>
              <button
                type="button"
                onClick={() => onChange({ disabilityType: "other" })}
                className={`px-2 py-1 rounded-full border text-[11px] ${
                  victim.disabilityType === "other"
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                Other
              </button>
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
}: {
  applicant: ApplicantInfo;
  onChange: (patch: Partial<ApplicantInfo>) => void;
}) {
  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        Who is filling out this application?
      </h2>
      <p className="text-xs text-slate-300">
        If you are the injured victim and over 18, you are both the victim and
        the applicant. If you are a parent, spouse, or someone who paid bills,
        you may be applying on the victim&apos;s behalf.
      </p>

      <div className="space-y-2 text-xs">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            className="h-3 w-3"
            checked={applicant.isSameAsVictim}
            onChange={() => onChange({ isSameAsVictim: true })}
          />
          <span>I am the victim (my information is the same as above)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            className="h-3 w-3"
            checked={!applicant.isSameAsVictim}
            onChange={() => onChange({ isSameAsVictim: false })}
          />
          <span>
            I am applying on behalf of the victim (parent, spouse, other)
          </span>
        </label>
      </div>

      {!applicant.isSameAsVictim && (
        <div className="space-y-4 pt-3 border-t border-slate-800">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Your first name *"
              value={applicant.firstName ?? ""}
              onChange={(v) => onChange({ firstName: v })}
            />
            <Field
              label="Your last name *"
              value={applicant.lastName ?? ""}
              onChange={(v) => onChange({ lastName: v })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Your date of birth"
              type="date"
              value={applicant.dateOfBirth ?? ""}
              onChange={(v) => onChange({ dateOfBirth: v })}
            />
            <Field
              label="Relationship to victim"
              placeholder="Parent, spouse, sibling, friend..."
              value={applicant.relationshipToVictim ?? ""}
              onChange={(v) => onChange({ relationshipToVictim: v })}
            />
          </div>

          <div className="space-y-3">
            <Field
              label="Your street address"
              value={applicant.streetAddress ?? ""}
              onChange={(v) => onChange({ streetAddress: v })}
            />
            <Field
              label="Apartment / Unit"
              value={applicant.apt ?? ""}
              onChange={(v) => onChange({ apt: v })}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="City"
                value={applicant.city ?? ""}
                onChange={(v) => onChange({ city: v })}
              />
              <Field
                label="State"
                value={applicant.state ?? ""}
                onChange={(v) => onChange({ state: v })}
              />
              <Field
                label="ZIP code"
                value={applicant.zip ?? ""}
                onChange={(v) => onChange({ zip: v })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Email"
              type="email"
              value={applicant.email ?? ""}
              onChange={(v) => onChange({ email: v })}
            />
            <Field
              label="Cell phone"
              value={applicant.cellPhone ?? ""}
              onChange={(v) => onChange({ cellPhone: v })}
            />
          </div>
                    <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
            <p className="text-slate-200">
              If the victim is a minor or an incapacitated adult, do you have
              legal guardianship for them?
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onChange({ hasLegalGuardianship: true })}
                className={`px-3 py-1 rounded-full border text-[11px] ${
                  applicant.hasLegalGuardianship
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => onChange({ hasLegalGuardianship: false })}
                className={`px-3 py-1 rounded-full border text-[11px] ${
                  applicant.hasLegalGuardianship === false
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                No / Not sure
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              If you are not the legal guardian but are helping with the
              application, the Attorney General&apos;s office may still contact you
              for information, but they may also need to contact a parent or
              legal guardian.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function CrimeForm({
  crime,
  onChange,
}: {
  crime: CrimeInfo;
  onChange: (patch: Partial<CrimeInfo>) => void;
}) {
  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        Crime and incident details
      </h2>
      <p className="text-xs text-slate-300">
        This section is about what happened. You do not need to remember every
        detail. Do your best, and it&apos;s okay to leave something blank if you
        truly don&apos;t know.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Date of crime *"
          type="date"
          value={crime.dateOfCrime}
          onChange={(v) => onChange({ dateOfCrime: v })}
        />
        <Field
          label="Date crime was reported"
          type="date"
          value={crime.dateReported}
          onChange={(v) => onChange({ dateReported: v })}
        />
      </div>

      <div className="space-y-3">
        <Field
          label="Where did the crime happen? (street address or location) *"
          value={crime.crimeAddress}
          onChange={(v) => onChange({ crimeAddress: v })}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="City *"
            value={crime.crimeCity}
            onChange={(v) => onChange({ crimeCity: v })}
          />
          <Field
            label="County"
            value={crime.crimeCounty}
            onChange={(v) => onChange({ crimeCounty: v })}
          />
          <Field
            label="Police department crime was reported to *"
            placeholder="e.g. Chicago Police Department"
            value={crime.reportingAgency}
            onChange={(v) => onChange({ reportingAgency: v })}
          />
        </div>
      </div>

      <Field
        label="Police report number (if you have it)"
        value={crime.policeReportNumber ?? ""}
        onChange={(v) => onChange({ policeReportNumber: v })}
      />

      <Field
        label="Briefly describe what happened"
        placeholder="In your own words, describe the incident."
        value={crime.crimeDescription}
        onChange={(v) => onChange({ crimeDescription: v })}
      />

      <Field
        label="Briefly describe the injuries"
        placeholder="For example: gunshot wound to leg, surgery, PTSD, etc."
        value={crime.injuryDescription}
        onChange={(v) => onChange({ injuryDescription: v })}
      />

      <div className="space-y-2 text-xs">
        <p className="text-slate-200">Do you know who did this?</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onChange({ offenderKnown: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
              crime.offenderKnown
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ offenderKnown: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
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
          />
          <Field
            label="Relationship to victim, if any"
            placeholder="Stranger, partner, family member, etc."
            value={crime.offenderRelationship ?? ""}
            onChange={(v) => onChange({ offenderRelationship: v })}
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
            onClick={() => onChange({ sexualAssaultKitPerformed: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
              crime.sexualAssaultKitPerformed
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ sexualAssaultKitPerformed: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
              crime.sexualAssaultKitPerformed === false
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            No / Not sure
          </button>
        </div>
      </div>

    </section>
  );
}

function CourtForm({
  court,
  onChange,
}: {
  court: CourtInfo;
  onChange: (patch: Partial<CourtInfo>) => void;
}) {
  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4 mt-4">
      <h2 className="text-lg font-semibold text-slate-50">
        Court & restitution information
      </h2>
      <p className="text-xs text-slate-300">
        If there is a criminal case, you can share what you know. It&apos;s okay
        if you don&apos;t know all of these details — answer what you can.
      </p>

      <div className="space-y-2 text-xs">
        <p className="text-slate-200">Was the offender arrested?</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onChange({ offenderArrested: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
              court.offenderArrested
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ offenderArrested: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
              court.offenderArrested === false
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            No / Not sure
          </button>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <p className="text-slate-200">Has the offender been charged in court?</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onChange({ offenderCharged: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
              court.offenderCharged
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ offenderCharged: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
              court.offenderCharged === false
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            No / Not sure
          </button>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <p className="text-slate-200">
          Have you been required to testify in the criminal case?
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onChange({ applicantTestified: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
              court.applicantTestified
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ applicantTestified: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
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
      />

      <Field
        label="What was the outcome of the criminal case? (if known)"
        placeholder="For example: convicted, case dismissed, plea deal, still pending..."
        value={court.criminalCaseOutcome ?? ""}
        onChange={(v) => onChange({ criminalCaseOutcome: v })}
      />

      <div className="space-y-2 text-xs">
        <p className="text-slate-200">
          Has the court ordered the offender to pay restitution (money directly
          to you or on your behalf)?
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onChange({ restitutionOrdered: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
              court.restitutionOrdered
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ restitutionOrdered: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
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
                restitutionAmount: v
                  ? Number(v.replace(/[^0-9.]/g, ""))
                  : undefined,
              })
            }
          />
        )}
      </div>

      <div className="space-y-2 text-xs pt-3 border-t border-slate-800">
        <p className="text-slate-200">
          Has the offender been involved in a human trafficking court
          proceeding related to this incident?
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              onChange({ humanTraffickingCaseFiled: true })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${
              court.humanTraffickingCaseFiled
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({ humanTraffickingCaseFiled: false })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${
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
              onChange={(v) =>
                onChange({ humanTraffickingCaseNumber: v })
              }
            />
            <Field
              label="Outcome of the human trafficking case (if known)"
              value={court.humanTraffickingCaseOutcome ?? ""}
              onChange={(v) =>
                onChange({ humanTraffickingCaseOutcome: v })
              }
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
}: {
  losses: LossesClaimed;
  onChange: (patch: Partial<LossesClaimed>) => void;
}) {
  const toggle = (key: keyof LossesClaimed) => {
    onChange({ [key]: !losses[key] } as Partial<LossesClaimed>);
  };

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        What do you need help paying for?
      </h2>
      <p className="text-xs text-slate-300">
        This section lists the types of expenses and losses that may be covered
        by Crime Victims Compensation. Choose everything that applies. You&apos;ll
        have a chance later to enter details and upload documents.
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
          />
          <Checkbox
            label="Dental care"
            checked={losses.dental}
            onChange={() => toggle("dental")}
          />
          <Checkbox
            label="Counseling / therapy"
            checked={losses.counseling}
            onChange={() => toggle("counseling")}
          />
          <Checkbox
            label="Transportation to medical or court"
            checked={losses.transportation}
            onChange={() => toggle("transportation")}
          />
          <Checkbox
            label="Accessibility costs (wheelchair ramps, etc.)"
            checked={losses.accessibilityCosts}
            onChange={() => toggle("accessibilityCosts")}
          />
          <Checkbox
            label="Temporary lodging / hotel"
            checked={losses.temporaryLodging}
            onChange={() => toggle("temporaryLodging")}
          />
          <Checkbox
            label="Relocation costs (moving for safety)"
            checked={losses.relocationCosts}
            onChange={() => toggle("relocationCosts")}
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
          />
          <Checkbox
            label="Loss of support to dependents"
            checked={losses.lossOfSupport}
            onChange={() => toggle("lossOfSupport")}
          />
          <Checkbox
            label="Loss of future earnings"
            checked={losses.lossOfFutureEarnings}
            onChange={() => toggle("lossOfFutureEarnings")}
          />
          <Checkbox
            label="Replacement service loss (services victim used to provide)"
            checked={losses.replacementServiceLoss}
            onChange={() => toggle("replacementServiceLoss")}
          />
          <Checkbox
            label="Tuition / school-related costs"
            checked={losses.tuition}
            onChange={() => toggle("tuition")}
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
          />
          <Checkbox
            label="Headstone"
            checked={losses.headstone}
            onChange={() => toggle("headstone")}
          />
          <Checkbox
            label="Crime scene cleanup"
            checked={losses.crimeSceneCleanup}
            onChange={() => toggle("crimeSceneCleanup")}
          />
          <Checkbox
            label="Towing and storage of vehicle"
            checked={losses.towingStorage}
            onChange={() => toggle("towingStorage")}
          />
          <Checkbox
            label="Doors, locks, windows (security repairs)"
            checked={losses.doors || losses.locks || losses.windows}
            onChange={() =>
              onChange({
                doors: !losses.doors,
                locks: !losses.locks,
                windows: !losses.windows,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-slate-100">
            Personal items & other
          </h3>
          <Checkbox
            label="Clothing or bedding taken as evidence"
            checked={losses.clothing || losses.bedding}
            onChange={() =>
              onChange({
                clothing: !losses.clothing,
                bedding: !losses.bedding,
              })
            }
          />
          <Checkbox
            label="Prosthetic appliances, eyeglasses, hearing aids"
            checked={
              losses.prostheticAppliances ||
              losses.eyeglassesContacts ||
              losses.hearingAids
            }
            onChange={() =>
              onChange({
                prostheticAppliances: !losses.prostheticAppliances,
                eyeglassesContacts: !losses.eyeglassesContacts,
                hearingAids: !losses.hearingAids,
              })
            }
          />
          <Checkbox
            label="Replacement costs for necessary items"
            checked={losses.replacementCosts}
            onChange={() => toggle("replacementCosts")}
          />
          <Checkbox
            label="Legal fees"
            checked={losses.legalFees}
            onChange={() => toggle("legalFees")}
          />
          <Checkbox
            label="Tattoo removal (human trafficking cases)"
            checked={losses.tattooRemoval}
            onChange={() => toggle("tattooRemoval")}
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        Choosing an item here does not guarantee payment, but it tells the
        program what you are asking to be considered. In later steps we&apos;ll
        connect each choice to specific documents and amounts.
      </p>
    </section>
  );
}

function MedicalForm({
  medical,
  onChange,
}: {
  medical: MedicalInfo;
  onChange: (patch: Partial<MedicalInfo>) => void;
}) {
  const primary = medical.providers[0] ?? {
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
    const updated = { ...primary, ...patch };
    const providers = [...medical.providers];
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
        If you are asking for help with medical, dental, hospital, or
        counseling bills, you can list at least one provider here. You do not
        need every detail to continue. If you don&apos;t have medical bills, you
        can leave this blank and move on.
      </p>

      <div className="space-y-3">
        <Field
          label="Main hospital / clinic / therapist name"
          value={primary.providerName}
          onChange={(v) => updatePrimary({ providerName: v })}
        />
        <div className="grid gap-3 sm:grid-cols-3">
        <Field
            label="City"
            value={primary.city || ""}
            onChange={(v) => updatePrimary({ city: v })}
        />
        <Field
            label="Provider phone"
            value={primary.phone || ""}
            onChange={(v) => updatePrimary({ phone: v })}
        />
        <Field
            label="Dates of service (if known)"
            value={primary.serviceDates || ""}
            onChange={(v) => updatePrimary({ serviceDates: v })}
        />
        </div>        <Field
          label="Approximate total amount of this bill"
          placeholder="For example: 2500"
          value={primary.amountOfBill?.toString() ?? ""}
          onChange={(v) =>
            updatePrimary({
              amountOfBill: v ? Number(v.replace(/[^0-9.]/g, "")) : undefined,
            })
          }
        />
      </div>

            <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
        <p className="text-slate-200">
          Do you have health insurance, public aid, or other programs that may
          pay some of these bills?
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onChange({ hasOtherSources: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
              medical.hasOtherSources
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ hasOtherSources: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
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
            onChange={(v) => onChange({ otherInsuranceDescription: v })}
          />
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        The official application allows you to list many providers. In a later
        version, we&apos;ll let you add more here, or your advocate can attach a
        full list.
      </p>
    </section>
  );
}

function EmploymentForm({
  employment,
  onChange,
}: {
  employment: EmploymentInfo;
  onChange: (patch: Partial<EmploymentInfo>) => void;
}) {
  const record = employment.employmentHistory[0] ?? {
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
    const updated = { ...record, ...patch };
    const history = [...employment.employmentHistory];
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
        If you missed work because of the crime or had to take time off for
        court or medical appointments, the program may consider paying for some
        of that lost income. You can start by entering your main job here.
      </p>

      <div className="space-y-3">
        <Field
          label="Employer name"
          value={record.employerName}
          onChange={(v) => updateRecord({ employerName: v })}
        />
        <Field
          label="Employer address"
          value={record.employerAddress ?? ""}
          onChange={(v) => updateRecord({ employerAddress: v })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Employer phone"
            value={record.employerPhone ?? ""}
            onChange={(v) => updateRecord({ employerPhone: v })}
          />
          <Field
            label="Your net monthly wages (take-home pay)"
            placeholder="For example: 2200"
            value={record.netMonthlyWages?.toString() ?? ""}
            onChange={(v) =>
              updateRecord({
                netMonthlyWages: v
                  ? Number(v.replace(/[^0-9.]/g, ""))
                  : undefined,
              })
            }
          />
        </div>
              <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
        <p className="text-slate-200">
          After the crime, did you receive sick time, vacation, personal time,
          disability, or other paid benefits from this employer?
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              onChange({ receivedSickOrVacationOrDisability: true })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${
              employment.receivedSickOrVacationOrDisability
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({ receivedSickOrVacationOrDisability: false })
            }
            className={`px-3 py-1 rounded-full border text-[11px] ${
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
            onChange={(v) => onChange({ benefitNotes: v })}
          />
        )}
      </div>
      </div>

      <p className="text-[11px] text-slate-400">
        On the official application, you can list up to six months of
        employment and indicate any sick, vacation, or disability benefits you
        received. In a later version, you&apos;ll be able to add more jobs and
        details here.
      </p>
    </section>
  );
}

function FuneralForm({
  funeral,
  onChange,
}: {
  funeral: FuneralInfo;
  onChange: (patch: Partial<FuneralInfo>) => void;
}) {
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
    const updated = { ...primaryPayment, ...patch };
    const payments = [...(funeral.payments ?? [])];
    payments[0] = {
      payerName: updated.payerName,
      relationshipToVictim: updated.relationshipToVictim,
      amountPaid: updated.amountPaid,
    };
    onChange({ payments });
  };

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">
        Funeral, burial, and dependents
      </h2>
      <p className="text-xs text-slate-300">
        If the victim died as a result of the crime, this program may help with
        funeral, burial, or cremation costs. You can enter basic information
        here. If this does not apply, you can leave it blank and continue.
      </p>

      <div className="space-y-3">
        <Field
          label="Funeral home name"
          value={funeral.funeralHomeName ?? ""}
          onChange={(v) => onChange({ funeralHomeName: v })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Funeral home phone"
            value={funeral.funeralHomePhone ?? ""}
            onChange={(v) => onChange({ funeralHomePhone: v })}
          />
          <Field
            label="Total funeral bill (approximate)"
            placeholder="For example: 8000"
            value={funeral.funeralBillTotal?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                funeralBillTotal: v
                  ? Number(v.replace(/[^0-9.]/g, ""))
                  : undefined,
              })
            }
          />
        </div>
      </div>

            <div className="space-y-3 pt-3 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-100">
          Cemetery information (if applicable)
        </h3>
        <Field
          label="Name of cemetery"
          value={funeral.cemeteryName ?? ""}
          onChange={(v) => onChange({ cemeteryName: v })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Cemetery phone"
            value={funeral.cemeteryPhone ?? ""}
            onChange={(v) => onChange({ cemeteryPhone: v })}
          />
          <Field
            label="Total cemetery bill (approximate)"
            placeholder="For example: 2000"
            value={funeral.cemeteryBillTotal?.toString() ?? ""}
            onChange={(v) =>
              onChange({
                cemeteryBillTotal: v
                  ? Number(v.replace(/[^0-9.]/g, ""))
                  : undefined,
              })
            }
          />
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-100">
          Who has paid or will pay these costs?
        </h3>
        <p className="text-[11px] text-slate-300">
          You can list one person here who has paid or is responsible for the
          funeral bill. In a later version, you&apos;ll be able to add more.
        </p>

        <div className="space-y-3">
          <Field
            label="Name of person paying"
            value={primaryPayment.payerName}
            onChange={(v) => updatePrimaryPayment({ payerName: v })}
          />
          <Field
            label="Relationship to victim"
            placeholder="Parent, spouse, sibling, friend..."
            value={primaryPayment.relationshipToVictim ?? ""}
            onChange={(v) =>
              updatePrimaryPayment({ relationshipToVictim: v })
            }
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
          />
        </div>
      </div>

      <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
        <p className="text-slate-200">
          Did you receive money from the City of Chicago Emergency Supplemental
          Victims Fund (ESVF) for funeral expenses?
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onChange({ receivedChicagoESVF: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
              funeral.receivedChicagoESVF
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ receivedChicagoESVF: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
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
            onClick={() => onChange({ lifeInsurancePolicyExists: true })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
              funeral.lifeInsurancePolicyExists
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ lifeInsurancePolicyExists: false })}
            className={`px-3 py-1 rounded-full border text-[11px] ${
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
            />
            <Field
              label="Name of beneficiary"
              value={funeral.lifeInsuranceBeneficiary ?? ""}
              onChange={(v) => onChange({ lifeInsuranceBeneficiary: v })}
            />
            <Field
              label="Beneficiary phone"
              value={funeral.lifeInsuranceBeneficiaryPhone ?? ""}
              onChange={(v) =>
                onChange({ lifeInsuranceBeneficiaryPhone: v })
              }
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
            />
          </div>
        )}
      </div>

            <div className="space-y-3 pt-3 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-100">
          Dependents who relied on the victim&apos;s income
        </h3>
        <p className="text-[11px] text-slate-300">
          If anyone depended on the victim financially (children, spouse, others),
          you can list one here. In a later version you&apos;ll be able to add more.
        </p>

        {(() => {
          const dep =
            funeral.dependents && funeral.dependents.length > 0
              ? funeral.dependents[0]
              : { name: "", relationshipToVictim: "", dateOfBirth: "", guardianNamePhone: "" };

          const updateDep = (patch: Partial<typeof dep>) => {
            const updated = { ...dep, ...patch };
            const deps = [...(funeral.dependents ?? [])];
            deps[0] = updated;
            onChange({ dependents: deps });
          };

          return (
            <div className="space-y-3">
              <Field
                label="Dependent name"
                value={dep.name}
                onChange={(v) => updateDep({ name: v })}
              />
              <Field
                label="Relationship to victim"
                placeholder="Child, spouse, partner, etc."
                value={dep.relationshipToVictim ?? ""}
                onChange={(v) => updateDep({ relationshipToVictim: v })}
              />
              <Field
                label="Dependent date of birth"
                type="date"
                value={dep.dateOfBirth ?? ""}
                onChange={(v) => updateDep({ dateOfBirth: v })}
              />
              <Field
                label="Guardian name & phone (if minor)"
                value={dep.guardianNamePhone ?? ""}
                onChange={(v) => updateDep({ guardianNamePhone: v })}
              />
            </div>
          );
        })()}
      </div>

      <p className="text-[11px] text-slate-400">
        The official application also asks about dependents of the victim and
        ongoing loss of support. In a later version, you&apos;ll be able to add
        each dependent here and link them to loss-of-support claims.
      </p>
    </section>
  );
}

function SummaryView({
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
}: {
  victim: VictimInfo;
  applicant: ApplicantInfo;
  crime: CrimeInfo;
  losses: LossesClaimed;
  medical: MedicalInfo;
  employment: EmploymentInfo;
  funeral: FuneralInfo;
  certification: CertificationInfo;
  onChangeCertification: (patch: Partial<CertificationInfo>) => void;
  onDownloadSummaryPdf: () => void; // 👈 ADD
}) {
              const selectedLosses = Object.entries(losses)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  const primaryProvider = medical.providers[0];
const primaryJob = employment.employmentHistory[0];
const primaryFuneralPayer = funeral.payments?.[0];
  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4 text-sm">
      <h2 className="text-lg font-semibold text-slate-50">Quick summary</h2>
      <p className="text-xs text-slate-300">
        This is a quick snapshot of what you&apos;ve entered so far. You&apos;ll
        get a more detailed review before anything is turned into a PDF.
      </p>

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
              You indicated that the victim and applicant are the same person.
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
        <h3 className="font-semibold text-slate-100">
          Losses you&apos;re asking to be considered
        </h3>
        {selectedLosses.length === 0 ? (
          <p className="text-slate-300">
            You haven&apos;t selected any yet. Go back to &quot;Losses & money&quot;
            to choose what this program should review.
          </p>
        ) : (
          <ul className="list-disc list-inside text-slate-300">
            {selectedLosses.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <h3 className="font-semibold text-slate-100">
          Medical / counseling snapshot
        </h3>
        {primaryProvider && primaryProvider.providerName ? (
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
          <p className="text-slate-300">
            No medical provider entered yet. If you have hospital or counseling
            bills, you can add at least one on the previous step.
          </p>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
  <h3 className="font-semibold text-slate-100">Work & income snapshot</h3>
  {primaryJob && primaryJob.employerName ? (
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
    <p className="text-slate-300">
      No work or income information entered yet. If you lost wages because of
      the crime, you can add your main job in the Work & income step.
    </p>
  )}
</div>

<div className="space-y-1.5 text-xs">
  <h3 className="font-semibold text-slate-100">
    Funeral & burial snapshot
  </h3>
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
      {primaryFuneralPayer && primaryFuneralPayer.payerName ? (
        <>
          <p>
            Payer: {primaryFuneralPayer.payerName} (
            {primaryFuneralPayer.relationshipToVictim || "relationship not set"}
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
        <p className="text-slate-300">
          No specific payer information entered yet.
        </p>
      )}
      <p>
        ESVF help:{" "}
        {funeral.receivedChicagoESVF
          ? funeral.esvfAmount != null
            ? `Yes, about $${funeral.esvfAmount}`
            : "Yes"
          : funeral.receivedChicagoESVF === false
          ? "No / not received"
          : "Not specified"}
      </p>
    </>
  ) : (
    <p className="text-slate-300">
      No funeral or burial information entered yet. If the victim passed away
      and you have funeral bills, you can add them in the Funeral & dependents
      step.
    </p>
  )}
</div>

      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={onDownloadSummaryPdf}
          className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-slate-800 transition"
        >
          Download summary PDF
        </button>
        <a
          href="/compensation/documents"
          className="inline-flex items-center rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-200 hover:bg-emerald-500/20 transition"
        >
          Go to document upload →
        </a>
      </div>
      

      <div className="space-y-1.5 text-xs pt-3 border-t border-slate-800">
        <h3 className="font-semibold text-slate-100">
          Certification & authorization
        </h3>
        <p className="text-[11px] text-slate-300">
          On the official Illinois Crime Victims Compensation application, you
          must certify that the information is true, understand that certain
          payments may need to be repaid if you recover money from other
          sources, and authorize the Attorney General&apos;s office to request
          records needed to review your claim.
        </p>

        <div className="space-y-2 mt-2">
          <label className="flex items-start gap-2 text-[11px] text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={!!certification.acknowledgesSubrogation}
              onChange={(e) =>
                onChangeCertification({
                  acknowledgesSubrogation: e.target.checked,
                })
              }
              className="mt-[2px] h-3 w-3 rounded border-slate-600 bg-slate-950 text-emerald-400"
            />
            <span>
              I understand that if I receive money from the offender, a civil
              lawsuit, insurance, or another government program for the same
              expenses, I may need to repay some or all of what I receive from
              this program.
            </span>
          </label>

          <label className="flex items-start gap-2 text-[11px] text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={!!certification.acknowledgesRelease}
              onChange={(e) =>
                onChangeCertification({
                  acknowledgesRelease: e.target.checked,
                })
              }
              className="mt-[2px] h-3 w-3 rounded border-slate-600 bg-slate-950 text-emerald-400"
            />
            <span>
              I authorize the Attorney General&apos;s office to request medical,
              law enforcement, employment, and insurance records needed to
              process this claim.
            </span>
          </label>

          <label className="flex items-start gap-2 text-[11px] text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={!!certification.acknowledgesPerjury}
              onChange={(e) =>
                onChangeCertification({
                  acknowledgesPerjury: e.target.checked,
                })
              }
              className="mt-[2px] h-3 w-3 rounded border-slate-600 bg-slate-950 text-emerald-400"
            />
            <span>
              I certify that the information I have provided is true, accurate,
              and complete to the best of my knowledge, and I understand that
              false statements may be punishable by law.
            </span>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          <Field
            label="Applicant signature (type your full name)"
            value={certification.applicantSignatureName ?? ""}
            onChange={(v) =>
              onChangeCertification({ applicantSignatureName: v })
            }
          />
          <Field
            label="Date"
            type="date"
            value={certification.applicantSignatureDate ?? ""}
            onChange={(v) =>
              onChangeCertification({ applicantSignatureDate: v })
            }
          />
        </div>

        <div className="space-y-2 mt-3">
          <p className="text-[11px] text-slate-200">
            Are you being represented by an attorney for this Crime Victims
            Compensation claim?
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                onChangeCertification({ representedByAttorney: true })
              }
              className={`px-3 py-1 rounded-full border text-[11px] ${
                certification.representedByAttorney
                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeCertification({ representedByAttorney: false })
              }
              className={`px-3 py-1 rounded-full border text-[11px] ${
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
                onChange={(v) =>
                  onChangeCertification({ attorneyName: v })
                }
              />
              <Field
                label="ARDC number (if known)"
                value={certification.attorneyArdc ?? ""}
                onChange={(v) =>
                  onChangeCertification({ attorneyArdc: v })
                }
              />
              <Field
                label="Attorney address"
                value={certification.attorneyAddress ?? ""}
                onChange={(v) =>
                  onChangeCertification({ attorneyAddress: v })
                }
              />
              <Field
                label="City"
                value={certification.attorneyCity ?? ""}
                onChange={(v) =>
                  onChangeCertification({ attorneyCity: v })
                }
              />
              <Field
                label="State"
                value={certification.attorneyState ?? ""}
                onChange={(v) =>
                  onChangeCertification({ attorneyState: v })
                }
              />
              <Field
                label="ZIP"
                value={certification.attorneyZip ?? ""}
                onChange={(v) =>
                  onChangeCertification({ attorneyZip: v })
                }
              />
              <Field
                label="Phone"
                value={certification.attorneyPhone ?? ""}
                onChange={(v) =>
                  onChangeCertification({ attorneyPhone: v })
                }
              />
              <Field
                label="Email"
                value={certification.attorneyEmail ?? ""}
                onChange={(v) =>
                  onChangeCertification({ attorneyEmail: v })
                }
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs text-slate-200 space-y-1">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
      />
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-2 text-[11px] text-slate-200 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-[2px] h-3 w-3 rounded border-slate-600 bg-slate-950 text-emerald-400"
      />
      <span>{label}</span>
    </label>
  );
}