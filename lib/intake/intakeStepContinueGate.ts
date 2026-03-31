/**
 * Per-step "can Continue" and human-facing missing-item keys for intake (under intake.requiredBeforeContinue.*).
 */

import type { CompensationApplication } from "@/lib/compensationSchema";
import type { IntakeFlowStep } from "@/lib/intake/stepCompleteness";
import { stepHasIntrinsicRequiredFields, intakeTabComplete } from "@/lib/intake/stepCompleteness";

export type IntakeContinueAcks = {
  lossesNone: boolean;
  employmentNoEmployer: boolean;
  funeralIncomplete: boolean;
};

const EMPTY_ACKS: IntakeContinueAcks = {
  lossesNone: false,
  employmentNoEmployer: false,
  funeralIncomplete: false,
};

function lossesAnySelected(app: CompensationApplication): boolean {
  return Object.entries(app.losses).some(([k, v]) => k !== "otherExpensesDescription" && v === true);
}

/** i18n keys under intake.requiredBeforeContinue (each maps to a string in en/es). */
export function getIntakeStepMissingKeys(
  step: IntakeFlowStep,
  app: CompensationApplication,
  stateCode: "IL" | "IN",
  acks: IntakeContinueAcks = EMPTY_ACKS
): string[] {
  const { applicant, contact, victim, crime, losses, employment, funeral } = app;
  const keys: string[] = [];

  switch (step) {
    case "applicant": {
      if (contact.prefersEnglish === false && !contact.preferredLanguage?.trim()) {
        keys.push("intake.requiredBeforeContinue.contactPreferredLanguage");
      }
      if (contact.workingWithAdvocate === true) {
        if (!contact.advocateName?.trim()) keys.push("intake.requiredBeforeContinue.advocateName");
        if (!contact.advocatePhone?.trim()) keys.push("intake.requiredBeforeContinue.advocatePhone");
      }
      if (!applicant.isSameAsVictim) {
        if (!applicant.firstName?.trim()) keys.push("intake.requiredBeforeContinue.applicantFirstName");
        if (!applicant.lastName?.trim()) keys.push("intake.requiredBeforeContinue.applicantLastName");
        if (!applicant.dateOfBirth) keys.push("intake.requiredBeforeContinue.applicantDateOfBirth");
        if (!applicant.relationshipToVictim?.trim()) {
          keys.push("intake.requiredBeforeContinue.applicantRelationship");
        }
        if (!applicant.streetAddress?.trim()) keys.push("intake.requiredBeforeContinue.applicantStreet");
        if (!applicant.city?.trim()) keys.push("intake.requiredBeforeContinue.applicantCity");
        if (!applicant.state?.trim()) keys.push("intake.requiredBeforeContinue.applicantState");
        if (!applicant.zip?.trim()) keys.push("intake.requiredBeforeContinue.applicantZip");
        if (stateCode === "IN") {
          const digits = (applicant.last4SSN ?? "").replace(/\D/g, "");
          if (digits.length < 4) keys.push("intake.requiredBeforeContinue.applicantLast4Ssn");
        }
        if (typeof applicant.seekingOwnExpenses !== "boolean") {
          keys.push("intake.requiredBeforeContinue.applicantSeekingOwnExpenses");
        }
      }
      break;
    }
    case "victim": {
      if (!victim.firstName?.trim()) keys.push("intake.requiredBeforeContinue.victimFirstName");
      if (!victim.lastName?.trim()) keys.push("intake.requiredBeforeContinue.victimLastName");
      if (!victim.dateOfBirth) keys.push("intake.requiredBeforeContinue.victimDateOfBirth");
      if (!victim.streetAddress?.trim()) keys.push("intake.requiredBeforeContinue.victimStreet");
      if (!victim.city?.trim()) keys.push("intake.requiredBeforeContinue.victimCity");
      if (!victim.zip?.trim()) keys.push("intake.requiredBeforeContinue.victimZip");
      if (!victim.state?.trim()) keys.push("intake.requiredBeforeContinue.victimState");
      if (stateCode === "IN") {
        const digits = (victim.last4SSN ?? "").replace(/\D/g, "");
        if (digits.length < 4) keys.push("intake.requiredBeforeContinue.victimLast4Ssn");
        if (!contact.whoIsSubmitting) keys.push("intake.requiredBeforeContinue.whoIsSubmitting");
      }
      break;
    }
    case "crime": {
      if (!crime.dateOfCrime) keys.push("intake.requiredBeforeContinue.crimeDate");
      if (!crime.crimeAddress?.trim()) keys.push("intake.requiredBeforeContinue.crimeAddress");
      if (!crime.crimeCity?.trim()) keys.push("intake.requiredBeforeContinue.crimeCity");
      if (!crime.reportingAgency?.trim()) keys.push("intake.requiredBeforeContinue.reportingAgency");
      break;
    }
    case "losses": {
      if (!lossesAnySelected(app) && !acks.lossesNone) {
        keys.push("intake.requiredBeforeContinue.selectLossCategory");
      }
      break;
    }
    case "medical": {
      if (stepHasIntrinsicRequiredFields(step, app) && !intakeTabComplete(step, app, stateCode)) {
        keys.push("intake.requiredBeforeContinue.medicalProviderName");
      }
      break;
    }
    case "employment": {
      if (losses.lossOfEarnings) {
        const hasEmployer = employment.employmentHistory?.some((e) => e.employerName?.trim());
        if (!hasEmployer && !acks.employmentNoEmployer) {
          keys.push("intake.requiredBeforeContinue.employmentEmployerOrConfirm");
        }
      }
      break;
    }
    case "funeral": {
      const funeralSelected = losses.funeralBurial || losses.headstone;
      const hasData = !!(
        funeral.funeralHomeName?.trim() ||
        funeral.funeralBillTotal ||
        (funeral.payments && funeral.payments.length > 0)
      );
      if (funeralSelected && !hasData && !acks.funeralIncomplete) {
        keys.push("intake.requiredBeforeContinue.funeralDetailsOrConfirm");
      }
      break;
    }
    case "documents":
    case "summary":
      break;
    default:
      break;
  }

  return keys;
}

export function canContinueFromIntakeStep(
  step: IntakeFlowStep,
  app: CompensationApplication,
  stateCode: "IL" | "IN",
  acks: IntakeContinueAcks
): boolean {
  if (step === "documents" || step === "summary") return true;
  return getIntakeStepMissingKeys(step, app, stateCode, acks).length === 0;
}
