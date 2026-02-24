// lib/eligibilitySchemaIN.ts
// Indiana Violent Crime Victim Compensation Fund eligibility check

export type INApplicantType =
  | "victim"
  | "surviving_spouse"
  | "dependent_child"
  | "none";

export type INYesNoNotSure = "yes" | "no" | "not_sure";
export type INMinorGuardianAnswer = "yes" | "no" | "not_sure" | "na";

export interface EligibilityCheckAnswersIN {
  applicantType: INApplicantType | null;
  crimeInIndiana: INYesNoNotSure | null;
  reported72HoursCooperate: INYesNoNotSure | null;
  min100OutOfPocket: INYesNoNotSure | null;
  victimDidNotContribute: INYesNoNotSure | null;
  within180Days: INYesNoNotSure | null;
  minorGuardianWillSign: INMinorGuardianAnswer | null; // or N/A if not minor
}

export type EligibilityResult =
  | "eligible"
  | "needs_review"
  | "not_eligible";

export type EligibilityReadiness =
  | "ready"
  | "missing_info"
  | "not_ready";

export interface EligibilityOutcome {
  result: EligibilityResult;
  readiness: EligibilityReadiness;
}

export const emptyEligibilityAnswersIN: EligibilityCheckAnswersIN = {
  applicantType: null,
  crimeInIndiana: null,
  reported72HoursCooperate: null,
  min100OutOfPocket: null,
  victimDidNotContribute: null,
  within180Days: null,
  minorGuardianWillSign: null,
};

export function computeEligibilityOutcomeIN(
  answers: EligibilityCheckAnswersIN
): EligibilityOutcome {
  if (answers.applicantType === "none") {
    return { result: "not_eligible", readiness: "ready" };
  }

  const applicantOk =
    answers.applicantType === "victim" ||
    answers.applicantType === "surviving_spouse" ||
    answers.applicantType === "dependent_child";

  if (!applicantOk) {
    return { result: "needs_review", readiness: "ready" };
  }

  let readiness: EligibilityReadiness = "ready";

  if (answers.crimeInIndiana === "no") {
    return { result: "not_eligible", readiness: "ready" };
  }
  if (answers.crimeInIndiana === "not_sure") readiness = "missing_info";

  if (answers.reported72HoursCooperate === "no") readiness = "missing_info";
  if (answers.reported72HoursCooperate === "not_sure") readiness = readiness === "ready" ? "missing_info" : readiness;

  if (answers.min100OutOfPocket === "no") readiness = "missing_info";
  if (answers.min100OutOfPocket === "not_sure") readiness = readiness === "ready" ? "missing_info" : readiness;

  if (answers.victimDidNotContribute === "no") return { result: "not_eligible", readiness: "ready" };
  if (answers.victimDidNotContribute === "not_sure") readiness = readiness === "ready" ? "missing_info" : readiness;

  if (answers.within180Days === "no") readiness = "missing_info";
  if (answers.within180Days === "not_sure") readiness = readiness === "ready" ? "missing_info" : readiness;

  if (answers.minorGuardianWillSign === "no") readiness = "not_ready";
  if (answers.minorGuardianWillSign === "not_sure") readiness = readiness === "ready" ? "missing_info" : readiness;

  return { result: "eligible", readiness };
}
