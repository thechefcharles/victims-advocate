// lib/eligibilitySchema.ts
// Illinois Crime Victims Compensation eligibility check (7 questions)

// Q1: Who is applying?
export type ApplicantType =
  | "victim_18plus_own"
  | "parent_minor"
  | "parent_disabled"
  | "paid_expenses"
  | "none";

// Q2: Victim age or legal status
export type VictimStatusAnswer = "yes" | "no" | "not_sure";

// Q3: Who will sign?
export type SignerAnswer = "applicant" | "guardian" | "not_sure";

// Q4: Police report
export type PoliceReportAnswer = "yes" | "no" | "not_sure";

// Q5: Police report details
export type PoliceReportDetailsAnswer =
  | "have_number"
  | "have_agency"
  | "dont_have";

// Q6: Expenses (multi-select)
export type ExpenseType =
  | "medical_hospital"
  | "funeral_burial"
  | "counseling"
  | "not_sure";
export type ExpensesAnswer = ExpenseType[];

// Q7: Contact reliability
export type ContactReliabilityAnswer = "yes" | "not_sure" | "no";

export interface EligibilityCheckAnswers {
  applicantType: ApplicantType | null;
  victimUnder18OrDisabled: VictimStatusAnswer | null;
  whoWillSign: SignerAnswer | null;
  crimeReportedToPolice: PoliceReportAnswer | null;
  policeReportDetails: PoliceReportDetailsAnswer | null;
  expensesSought: ExpensesAnswer;
  canReceiveContact45Days: ContactReliabilityAnswer | null;
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

export const emptyEligibilityAnswers: EligibilityCheckAnswers = {
  applicantType: null,
  victimUnder18OrDisabled: null,
  whoWillSign: null,
  crimeReportedToPolice: null,
  policeReportDetails: null,
  expensesSought: [],
  canReceiveContact45Days: null,
};

/**
 * Compute eligibility outcome from answers.
 * - eligible: clearly matches applicant types, confirms signature
 * - needs_review: might qualify but checker can't confirm
 * - not_eligible: matches none of the applicant types (Q1 "none")
 */
export function computeEligibilityOutcome(
  answers: EligibilityCheckAnswers
): EligibilityOutcome {
  // Q1: "None" → not_eligible
  if (answers.applicantType === "none") {
    return {
      result: "not_eligible",
      readiness: "ready",
    };
  }

  // Q1: first four options → eligible by applicant type
  const applicantTypeOk =
    answers.applicantType === "victim_18plus_own" ||
    answers.applicantType === "parent_minor" ||
    answers.applicantType === "parent_disabled" ||
    answers.applicantType === "paid_expenses";

  if (!applicantTypeOk) {
    // "not_sure" or missing → needs_review
    return {
      result: "needs_review",
      readiness: "ready",
    };
  }

  // Q3: who will sign
  const signerOk =
    answers.whoWillSign === "applicant" || answers.whoWillSign === "guardian";
  const signerNotSure = answers.whoWillSign === "not_sure";

  if (!signerOk && !signerNotSure) {
    // "not_sure" or missing → readiness: not_ready (don't deny)
    return {
      result: "eligible",
      readiness: "not_ready",
    };
  }

  if (signerNotSure) {
    return {
      result: "eligible",
      readiness: "not_ready",
    };
  }

  // Q7: contact reliability
  const contactOk = answers.canReceiveContact45Days === "yes";
  const contactNotSure = answers.canReceiveContact45Days === "not_sure";
  const contactNo = answers.canReceiveContact45Days === "no";

  if (contactNo) {
    return {
      result: "eligible",
      readiness: "not_ready",
    };
  }

  if (contactNotSure) {
    return {
      result: "eligible",
      readiness: "missing_info",
    };
  }

  // Q4, Q5: police report - flags missing_info if no/not_sure or dont_have
  let readiness: EligibilityReadiness = "ready";
  if (
    answers.crimeReportedToPolice === "no" ||
    answers.crimeReportedToPolice === "not_sure"
  ) {
    readiness = "missing_info";
  }
  if (answers.policeReportDetails === "dont_have") {
    readiness = "missing_info";
  }
  if (answers.expensesSought.includes("not_sure")) {
    readiness = readiness === "ready" ? "missing_info" : readiness;
  }

  return {
    result: "eligible",
    readiness,
  };
}
