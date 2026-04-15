/**
 * Domain 5.3 — Denial Prevention Engine.
 *
 * Illinois CVC has 13 documented denial categories. This engine runs every
 * check before submission and surfaces risks so the applicant can fix them.
 *
 * Check severity levels per category:
 *   BLOCKING → must be resolved before submit (e.g. past filing deadline,
 *              missing required authorizations)
 *   HIGH     → approaching a blocker, risks submission rejection
 *   WARNING  → surfaced, but does not block
 *   PASS     → no issue
 *
 * Overall risk roll-up:
 *   BLOCKING: any single BLOCKING check
 *   HIGH:     2+ HIGH checks
 *   MEDIUM:   1 HIGH check OR 3+ WARNING checks
 *   LOW:      otherwise
 */

export type CheckSeverity = "PASS" | "WARNING" | "HIGH" | "BLOCKING";
export type OverallRiskLevel = "low" | "medium" | "high" | "blocking";

export interface DenialCheckEntry {
  category: number; // 1..13
  name: string;
  severity: CheckSeverity;
  message: string;
}

export interface DenialCheckResult {
  checks: DenialCheckEntry[];
  blockingCategories: number[];
  warningCategories: number[];
  overallRiskLevel: OverallRiskLevel;
  passedAll: boolean;
}

// ---------------------------------------------------------------------------
// Input shape — the subset of intake/state info needed to run checks.
// Callers assemble this from intake_sessions.draft_payload + state config.
// ---------------------------------------------------------------------------

export interface DenialCheckInput {
  stateCode: "IL" | "IN";
  now?: Date;

  // Category 1 — cooperation
  cooperationAnswered?: boolean;
  policeReportNumberProvided?: boolean;
  alternateVerificationProvided?: boolean;

  // Category 2 — contributory conduct
  contributoryConductFlag?: boolean;

  // Category 3 — filing deadline
  crimeDate?: string | null;
  filingDeadlineDays: number | null;

  // Category 4 — report deadline
  reportDate?: string | null;
  reportDeadlineDays: number | null;
  crimeType?: string | null;
  policeReportException?: { crimeType: string; alternateVerification: string } | null;

  // Category 5 — crime covered
  crimeCoveredByCvca?: boolean;

  // Category 6 — eligible applicant
  filerType?: string | null;
  allowedFilerTypes: string[];

  // Category 7 — collateral sources
  hasInsuranceClaim?: boolean;
  hasMedicaidClaim?: boolean;
  hasWorkerCompClaim?: boolean;
  collateralCoordinationDocumented?: boolean;

  // Category 8 — expense documentation
  expenseCategoriesClaimed: string[]; // e.g. ["medical_hospital","funeral_burial"]
  documentedExpenseCategories: string[];

  // Category 9 — crime documentation
  crimeDocUploaded?: boolean;

  // Category 10 — application completeness
  requiredFieldsMissing: string[];

  // Category 11 — eligible expenses
  ineligibleExpenseCategoriesClaimed: string[];

  // Category 12 — disqualifying felony
  disqualifyingFelonyFlag?: boolean;

  // Category 13 — authorizations
  requiresSubrogation: boolean;
  subrogationSigned?: boolean;
  requiresReleaseOfInfo: boolean;
  releaseOfInfoSigned?: boolean;
}

// ---------------------------------------------------------------------------
// Category checks
// ---------------------------------------------------------------------------

function check1Cooperation(i: DenialCheckInput): DenialCheckEntry {
  const cooperated =
    i.cooperationAnswered === true ||
    Boolean(i.policeReportNumberProvided) ||
    Boolean(i.alternateVerificationProvided);
  return cooperated
    ? { category: 1, name: "cooperation", severity: "PASS", message: "" }
    : {
        category: 1,
        name: "cooperation",
        severity: "HIGH",
        message: "Cooperation with law enforcement is not documented yet.",
      };
}

function check2Contributory(i: DenialCheckInput): DenialCheckEntry {
  return i.contributoryConductFlag === true
    ? {
        category: 2,
        name: "contributory_conduct",
        severity: "HIGH",
        message:
          "Contributory conduct is flagged in the file. An advocate should review before submission.",
      }
    : { category: 2, name: "contributory_conduct", severity: "PASS", message: "" };
}

function check3FilingDeadline(i: DenialCheckInput): DenialCheckEntry {
  if (!i.crimeDate || i.filingDeadlineDays === null) {
    return {
      category: 3,
      name: "filing_deadline",
      severity: "WARNING",
      message: "Crime date or filing deadline is not set — cannot verify deadline.",
    };
  }
  const now = i.now ?? new Date();
  const elapsed = Math.floor(
    (now.getTime() - new Date(i.crimeDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (elapsed > i.filingDeadlineDays) {
    return {
      category: 3,
      name: "filing_deadline",
      severity: "BLOCKING",
      message: `The filing deadline (${i.filingDeadlineDays} days) has passed. Contact your advocate about late-filing options.`,
    };
  }
  if (elapsed > i.filingDeadlineDays - 30) {
    return {
      category: 3,
      name: "filing_deadline",
      severity: "HIGH",
      message: "The filing deadline is within 30 days. Submit as soon as possible.",
    };
  }
  return { category: 3, name: "filing_deadline", severity: "PASS", message: "" };
}

function check4ReportDeadline(i: DenialCheckInput): DenialCheckEntry {
  if (!i.crimeDate || i.reportDeadlineDays === null) {
    return { category: 4, name: "report_deadline", severity: "PASS", message: "" };
  }
  // Exception path — forensic-exam or other alternate verification flips this
  // to PASS regardless of the 72-hour window.
  if (
    i.policeReportException &&
    i.crimeType === i.policeReportException.crimeType &&
    i.alternateVerificationProvided
  ) {
    return { category: 4, name: "report_deadline", severity: "PASS", message: "" };
  }
  if (!i.reportDate) {
    return {
      category: 4,
      name: "report_deadline",
      severity: "HIGH",
      message: "No police report date on file.",
    };
  }
  const delayHours =
    (new Date(i.reportDate).getTime() - new Date(i.crimeDate).getTime()) / (1000 * 60 * 60);
  const limitHours = i.reportDeadlineDays; // stored as hours for IL (72)
  if (delayHours > limitHours) {
    return {
      category: 4,
      name: "report_deadline",
      severity: "HIGH",
      message: `Crime was not reported within ${limitHours} hours. A late-reporting explanation may be required.`,
    };
  }
  return { category: 4, name: "report_deadline", severity: "PASS", message: "" };
}

function check5CrimeCovered(i: DenialCheckInput): DenialCheckEntry {
  return i.crimeCoveredByCvca === false
    ? {
        category: 5,
        name: "crime_covered",
        severity: "BLOCKING",
        message: "The stated crime is not covered under the CVCA.",
      }
    : { category: 5, name: "crime_covered", severity: "PASS", message: "" };
}

function check6EligibleApplicant(i: DenialCheckInput): DenialCheckEntry {
  if (!i.filerType) {
    return {
      category: 6,
      name: "eligible_applicant",
      severity: "HIGH",
      message: "Filer type not selected.",
    };
  }
  return i.allowedFilerTypes.includes(i.filerType)
    ? { category: 6, name: "eligible_applicant", severity: "PASS", message: "" }
    : {
        category: 6,
        name: "eligible_applicant",
        severity: "BLOCKING",
        message: "Selected filer type is not eligible under the CVCA for this state.",
      };
}

function check7CollateralSources(i: DenialCheckInput): DenialCheckEntry {
  const hasAny =
    Boolean(i.hasInsuranceClaim) ||
    Boolean(i.hasMedicaidClaim) ||
    Boolean(i.hasWorkerCompClaim);
  if (hasAny && !i.collateralCoordinationDocumented) {
    return {
      category: 7,
      name: "collateral_sources",
      severity: "HIGH",
      message:
        "Insurance / Medicaid / workers' comp claims exist but coordination of benefits is not documented.",
    };
  }
  return { category: 7, name: "collateral_sources", severity: "PASS", message: "" };
}

function check8ExpenseDocs(i: DenialCheckInput): DenialCheckEntry {
  const missing = i.expenseCategoriesClaimed.filter(
    (c) => !i.documentedExpenseCategories.includes(c),
  );
  if (missing.length === 0) {
    return { category: 8, name: "expense_docs", severity: "PASS", message: "" };
  }
  return {
    category: 8,
    name: "expense_docs",
    severity: missing.length >= 2 ? "HIGH" : "WARNING",
    message: `Missing documentation for: ${missing.join(", ")}.`,
  };
}

function check9CrimeDocs(i: DenialCheckInput): DenialCheckEntry {
  return i.crimeDocUploaded
    ? { category: 9, name: "crime_docs", severity: "PASS", message: "" }
    : {
        category: 9,
        name: "crime_docs",
        severity: "HIGH",
        message:
          "No crime documentation (police report or alternate verification) has been uploaded.",
      };
}

function check10Complete(i: DenialCheckInput): DenialCheckEntry {
  if (i.requiredFieldsMissing.length === 0) {
    return { category: 10, name: "application_complete", severity: "PASS", message: "" };
  }
  return {
    category: 10,
    name: "application_complete",
    severity: i.requiredFieldsMissing.length >= 3 ? "HIGH" : "WARNING",
    message: `Required fields not yet filled: ${i.requiredFieldsMissing.join(", ")}.`,
  };
}

function check11EligibleExpenses(i: DenialCheckInput): DenialCheckEntry {
  if (i.ineligibleExpenseCategoriesClaimed.length === 0) {
    return { category: 11, name: "eligible_expenses", severity: "PASS", message: "" };
  }
  return {
    category: 11,
    name: "eligible_expenses",
    severity: "HIGH",
    message: `These expense categories are not eligible under the CVCA: ${i.ineligibleExpenseCategoriesClaimed.join(", ")}.`,
  };
}

function check12Felony(i: DenialCheckInput): DenialCheckEntry {
  return i.disqualifyingFelonyFlag === true
    ? {
        category: 12,
        name: "disqualifying_felony",
        severity: "HIGH",
        message: "A potentially disqualifying felony conviction is flagged.",
      }
    : { category: 12, name: "disqualifying_felony", severity: "PASS", message: "" };
}

function check13Authorizations(i: DenialCheckInput): DenialCheckEntry {
  const missing: string[] = [];
  if (i.requiresSubrogation && !i.subrogationSigned) missing.push("Subrogation Agreement");
  if (i.requiresReleaseOfInfo && !i.releaseOfInfoSigned) missing.push("Release of Information");
  if (missing.length === 0) {
    return { category: 13, name: "authorizations", severity: "PASS", message: "" };
  }
  return {
    category: 13,
    name: "authorizations",
    severity: "BLOCKING",
    message: `Required authorizations not signed: ${missing.join(", ")}.`,
  };
}

// ---------------------------------------------------------------------------
// Runner + roll-up
// ---------------------------------------------------------------------------

const ALL_CHECKS = [
  check1Cooperation,
  check2Contributory,
  check3FilingDeadline,
  check4ReportDeadline,
  check5CrimeCovered,
  check6EligibleApplicant,
  check7CollateralSources,
  check8ExpenseDocs,
  check9CrimeDocs,
  check10Complete,
  check11EligibleExpenses,
  check12Felony,
  check13Authorizations,
];

export function runDenialCheck(input: DenialCheckInput): DenialCheckResult {
  const checks = ALL_CHECKS.map((fn) => fn(input));
  const blocking = checks.filter((c) => c.severity === "BLOCKING");
  const high = checks.filter((c) => c.severity === "HIGH");
  const warning = checks.filter((c) => c.severity === "WARNING");

  let overall: OverallRiskLevel;
  if (blocking.length > 0) overall = "blocking";
  else if (high.length >= 2) overall = "high";
  else if (high.length === 1 || warning.length >= 3) overall = "medium";
  else overall = "low";

  return {
    checks,
    blockingCategories: blocking.map((c) => c.category),
    warningCategories: [...warning.map((c) => c.category), ...high.map((c) => c.category)],
    overallRiskLevel: overall,
    passedAll: blocking.length === 0 && high.length === 0 && warning.length === 0,
  };
}
