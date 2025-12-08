"use client";

import { useState } from "react"; // 👈 ADD THIS

import type {
  VictimInfo,
  ApplicantInfo,
  AdvocateContact,
  CompensationApplication,
  CrimeInfo,
  LossesClaimed,
  MedicalInfo,
  EmploymentInfo,
  FuneralInfo, // 👈 ADD THIS
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
});

export default function CompensationIntakePage() {
  const [step, setStep] = useState<IntakeStep>("victim");
// 0=victim,1=applicant,2=crime,3=losses,4=medical,5=employment,6=funeral,7=summary
const [maxStepIndex, setMaxStepIndex] = useState(0);
const [app, setApp] = useState<CompensationApplication>(
    makeEmptyApplication()
  );

const victim = app.victim;
const applicant = app.applicant;
const crime = app.crime;
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

  const updateMedical = (patch: Partial<MedicalInfo>) => {
    setApp((prev) => ({
      ...prev,
      medical: { ...prev.medical, ...patch },
    }));
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

{step === "crime" && <CrimeForm crime={crime} onChange={updateCrime} />}

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
            value={primary.city}
            onChange={(v) => updatePrimary({ city: v })}
          />
          <Field
            label="Provider phone"
            value={primary.phone}
            onChange={(v) => updatePrimary({ phone: v })}
          />
          <Field
            label="Dates of service (if known)"
            value={primary.serviceDates}
            onChange={(v) => updatePrimary({ serviceDates: v })}
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
        />
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
}: {
  victim: VictimInfo;
  applicant: ApplicantInfo;
  crime: CrimeInfo;
  losses: LossesClaimed;
  medical: MedicalInfo;
  employment: EmploymentInfo;
  funeral: FuneralInfo;
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