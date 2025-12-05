"use client";

import { useState } from "react";
import type {
  VictimInfo,
  ApplicantInfo,
  AdvocateContact,
  CompensationApplication,
  CrimeInfo,
} from "../../../lib/compensationSchema";

type IntakeStep = "victim" | "applicant" | "crime" | "summary";

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
  const [maxStepIndex, setMaxStepIndex] = useState(0); // 0=victim,1=applicant,2=crime,3=summary
  const [app, setApp] = useState<CompensationApplication>(
    makeEmptyApplication()
  );

  const stepOrder: IntakeStep[] = ["victim", "applicant", "crime", "summary"];

  const victim = app.victim;
  const applicant = app.applicant;
  const crime = app.crime;

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
    setStep("summary");
     setMaxStepIndex((prev) => Math.max(prev, 3));
  };

  const handleBack = () => {
    if (step === "applicant") setStep("victim");
    else if (step === "crime") setStep("applicant");
    else if (step === "summary") setStep("crime");
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
            Tell us about the victim, the applicant, and the incident
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
    label="Summary"
    active={step === "summary"}
    disabled={maxStepIndex < 3}
    onClick={() => maxStepIndex >= 3 && setStep("summary")}
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
          <CrimeForm crime={crime} onChange={updateCrime} />
        )}

        {step === "summary" && (
          <SummaryView victim={victim} applicant={applicant} crime={crime} />
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
              Review Summary →
            </button>
          )}

          {step === "summary" && (
            <button
              type="button"
              onClick={() =>
                alert("Next step (later): losses claimed & documentation.")
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

function SummaryView({
  victim,
  applicant,
  crime,
}: {
  victim: VictimInfo;
  applicant: ApplicantInfo;
  crime: CrimeInfo;
}) {
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