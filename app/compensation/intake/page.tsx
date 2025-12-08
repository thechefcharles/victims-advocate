"use client";

import { useState } from "react";
import type {
  VictimInfo,
  ApplicantInfo,
  AdvocateContact,
  CompensationApplication,
  CrimeInfo,
  LossesClaimed,
} from "../../../lib/compensationSchema";

type IntakeStep = "victim" | "applicant" | "crime" | "losses" | "summary";

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
  // 0=victim,1=applicant,2=crime,3=losses,4=summary
  const [maxStepIndex, setMaxStepIndex] = useState(0);
  const [app, setApp] = useState<CompensationApplication>(
    makeEmptyApplication()
  );

  const victim = app.victim;
  const applicant = app.applicant;
  const crime = app.crime;
  const losses = app.losses;

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
      alert(
        "Please select at least one type of expense or loss you are asking for help with."
      );
      return;
    }
    setStep("summary");
    setMaxStepIndex((prev) => Math.max(prev, 4));
  };

  const handleBack = () => {
    if (step === "applicant") setStep("victim");
    else if (step === "crime") setStep("applicant");
    else if (step === "losses") setStep("crime");
    else if (step === "summary") setStep("losses");
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
            label="Summary"
            active={step === "summary"}
            disabled={maxStepIndex < 4}
            onClick={() => maxStepIndex >= 4 && setStep("summary")}
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

        {step === "losses" && (
          <LossesForm losses={losses} onChange={updateLosses} />
        )}

        {step === "summary" && (
          <SummaryView
            victim={victim}
            applicant={applicant}
            crime={crime}
            losses={losses}
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
              Review Summary →
            </button>
          )}

          {step === "summary" && (
            <button
              type="button"
              onClick={() =>
                alert(
                  "Next (future phase): details for each loss type and document upload."
                )
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

function SummaryView({
  victim,
  applicant,
  crime,
  losses,
}: {
  victim: VictimInfo;
  applicant: ApplicantInfo;
  crime: CrimeInfo;
  losses: LossesClaimed;
}) {
  const selectedLosses = Object.entries(losses)
    .filter(([_, v]) => v)
    .map(([k]) => k);

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