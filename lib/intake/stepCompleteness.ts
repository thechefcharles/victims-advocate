/**
 * Required-field completeness for intake tabs (badges + gating applicant → victim → rest).
 */

import type {
  AdvocateContact,
  ApplicantInfo,
  CompensationApplication,
  CrimeInfo,
  EmploymentInfo,
  FuneralInfo,
  LossesClaimed,
  MedicalInfo,
  VictimInfo,
} from "@/lib/compensationSchema";

export type IntakeFlowStep =
  | "applicant"
  | "victim"
  | "crime"
  | "losses"
  | "medical"
  | "employment"
  | "funeral"
  | "documents"
  | "summary";

export function applicantSectionComplete(
  applicant: ApplicantInfo,
  contact: AdvocateContact,
  stateCode: "IL" | "IN"
): boolean {
  if (contact.prefersEnglish === false && !contact.preferredLanguage?.trim()) {
    return false;
  }
  if (contact.workingWithAdvocate === true) {
    if (!contact.advocateName?.trim() || !contact.advocatePhone?.trim()) {
      return false;
    }
  }

  if (applicant.isSameAsVictim) {
    return true;
  }

  if (
    !applicant.firstName?.trim() ||
    !applicant.lastName?.trim() ||
    !applicant.dateOfBirth ||
    !applicant.relationshipToVictim?.trim()
  ) {
    return false;
  }
  if (
    !applicant.streetAddress?.trim() ||
    !applicant.city?.trim() ||
    !applicant.state?.trim() ||
    !applicant.zip?.trim()
  ) {
    return false;
  }
  if (stateCode === "IN") {
    const digits = (applicant.last4SSN ?? "").replace(/\D/g, "");
    if (digits.length < 4) return false;
  }
  if (typeof applicant.seekingOwnExpenses !== "boolean") {
    return false;
  }
  return true;
}

export function victimSectionComplete(
  victim: VictimInfo,
  contact: AdvocateContact,
  stateCode: "IL" | "IN"
): boolean {
  if (
    !victim.firstName?.trim() ||
    !victim.lastName?.trim() ||
    !victim.dateOfBirth ||
    !victim.streetAddress?.trim() ||
    !victim.city?.trim() ||
    !victim.zip?.trim() ||
    !victim.state?.trim()
  ) {
    return false;
  }
  if (stateCode === "IN") {
    const digits = (victim.last4SSN ?? "").replace(/\D/g, "");
    if (digits.length < 4) return false;
    if (!contact.whoIsSubmitting) return false;
  }
  return true;
}

function crimeMinimumComplete(crime: CrimeInfo): boolean {
  return !!(
    crime.dateOfCrime &&
    crime.crimeAddress?.trim() &&
    crime.crimeCity?.trim() &&
    crime.reportingAgency?.trim()
  );
}

function lossesAnySelected(losses: LossesClaimed): boolean {
  return Object.entries(losses).some(([k, v]) => k !== "otherExpensesDescription" && v === true);
}

function medicalTabComplete(losses: LossesClaimed, medical: MedicalInfo): boolean {
  const need = losses.medicalHospital || losses.counseling;
  if (!need) return true;
  return !!(medical.providers?.[0]?.providerName?.trim());
}

function employmentTabComplete(losses: LossesClaimed, employment: EmploymentInfo): boolean {
  if (!losses.lossOfEarnings) return true;
  return !!(employment.employmentHistory?.[0]?.employerName?.trim());
}

function funeralTabComplete(losses: LossesClaimed, funeral: FuneralInfo): boolean {
  const sel = losses.funeralBurial || losses.headstone;
  if (!sel) return true;
  return !!(funeral.funeralHomeName?.trim() || funeral.funeralBillTotal);
}

function summaryTabComplete(app: CompensationApplication): boolean {
  const c = app.certification;
  return !!(
    c.applicantSignatureName?.trim() &&
    c.applicantSignatureDate &&
    c.acknowledgesSubrogation &&
    c.acknowledgesRelease &&
    c.acknowledgesPerjury
  );
}

/** True when this tab has form fields that must be filled (vs. “review and continue” only). */
export function stepHasIntrinsicRequiredFields(
  step: IntakeFlowStep,
  app: CompensationApplication
): boolean {
  switch (step) {
    case "documents":
      return false;
    case "medical":
      return !!(app.losses.medicalHospital || app.losses.counseling);
    case "employment":
      return !!app.losses.lossOfEarnings;
    case "funeral":
      return !!(app.losses.funeralBurial || app.losses.headstone);
    default:
      return true;
  }
}

/** True when required fields for that tab are satisfied (amber “complete” badge). */
export function intakeTabComplete(
  step: IntakeFlowStep,
  app: CompensationApplication,
  stateCode: "IL" | "IN"
): boolean {
  switch (step) {
    case "applicant":
      return applicantSectionComplete(app.applicant, app.contact, stateCode);
    case "victim":
      return victimSectionComplete(app.victim, app.contact, stateCode);
    case "crime":
      return crimeMinimumComplete(app.crime);
    case "losses":
      return lossesAnySelected(app.losses);
    case "medical":
      return medicalTabComplete(app.losses, app.medical);
    case "employment":
      return employmentTabComplete(app.losses, app.employment);
    case "funeral":
      return funeralTabComplete(app.losses, app.funeral);
    case "documents":
      return false;
    case "summary":
      return summaryTabComplete(app);
    default:
      return false;
  }
}

/**
 * Badge “complete” (amber): intrinsic required fields filled, OR user opened the tab and used Continue
 * when that tab has no required fields (documents; medical/employment/funeral when related losses unchecked).
 */
export function intakeTabDisplayComplete(
  step: IntakeFlowStep,
  app: CompensationApplication,
  stateCode: "IL" | "IN",
  continuedFrom: ReadonlySet<IntakeFlowStep>
): boolean {
  if (!stepHasIntrinsicRequiredFields(step, app)) {
    return continuedFrom.has(step);
  }
  return intakeTabComplete(step, app, stateCode);
}
