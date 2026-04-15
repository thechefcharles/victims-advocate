/**
 * Domain 5.3 — Payor-of-last-resort classifier.
 *
 * Illinois CVC is a payor of last resort: it pays only what other sources
 * don't cover. This pure function classifies a single expense category given
 * what the applicant has told us about collateral coverage.
 *
 * Pure — no DB, no async. Test-only logic.
 */

export type ExpenseCategory =
  | "medical_hospital"
  | "funeral_burial"
  | "lost_wages"
  | "mental_health"
  | "relocation"
  | "property_damage"
  | "pain_and_suffering"
  | "punitive_damages"
  | "other";

export interface ExpenseCollateralInfo {
  hasInsurance: boolean;
  insurancePaid: boolean;
  medicaidCovered: boolean;
  workerCompCovered: boolean;
  disabilityInsuranceCovered?: boolean;
}

export type ExpenseClassification =
  | "covered"
  | "sometimes_covered"
  | "not_covered"
  | "payor_of_last_resort_required";

export interface ClassificationResult {
  classification: ExpenseClassification;
  explanation: string;
}

const NEVER_COVERED: ExpenseCategory[] = [
  "property_damage",
  "pain_and_suffering",
  "punitive_damages",
];

export function classifyExpense(
  category: ExpenseCategory,
  coverage: ExpenseCollateralInfo,
): ClassificationResult {
  if (NEVER_COVERED.includes(category)) {
    return {
      classification: "not_covered",
      explanation:
        category === "property_damage"
          ? "Illinois CVC does not cover property damage."
          : category === "pain_and_suffering"
            ? "Illinois CVC does not cover pain and suffering damages."
            : "Illinois CVC does not cover punitive damages.",
    };
  }

  switch (category) {
    case "medical_hospital": {
      if (coverage.insurancePaid) {
        return {
          classification: "payor_of_last_resort_required",
          explanation:
            "Medical expenses are covered only for amounts NOT paid by insurance, Medicaid, or other sources. Document the remaining balance after collateral sources are applied.",
        };
      }
      if (coverage.medicaidCovered) {
        return {
          classification: "payor_of_last_resort_required",
          explanation:
            "Medicaid is primary. CVC covers only the remaining balance after Medicaid pays.",
        };
      }
      if (coverage.workerCompCovered) {
        return {
          classification: "payor_of_last_resort_required",
          explanation: "Workers' compensation is primary. CVC covers only the remainder.",
        };
      }
      return {
        classification: "covered",
        explanation:
          "Medical and hospital expenses are eligible. Attach itemized bills and any insurance EOBs.",
      };
    }

    case "funeral_burial": {
      if (coverage.hasInsurance && coverage.insurancePaid) {
        return {
          classification: "payor_of_last_resort_required",
          explanation:
            "CVC covers funeral/burial only for amounts not paid by life insurance or burial benefits.",
        };
      }
      return {
        classification: "covered",
        explanation:
          "Funeral and burial expenses are eligible. Attach itemized receipts.",
      };
    }

    case "lost_wages": {
      if (coverage.workerCompCovered) {
        return {
          classification: "not_covered",
          explanation:
            "Wages replaced by workers' compensation are not also payable by CVC.",
        };
      }
      if (coverage.disabilityInsuranceCovered) {
        return {
          classification: "payor_of_last_resort_required",
          explanation:
            "Disability insurance is primary. CVC covers only the remaining documented lost wages.",
        };
      }
      return {
        classification: "covered",
        explanation:
          "Document lost wages with employer verification and medical proof of inability to work.",
      };
    }

    case "mental_health": {
      return {
        classification: "covered",
        explanation:
          "Counseling with a licensed provider is covered. Bills must identify the licensed provider.",
      };
    }

    case "relocation": {
      return {
        classification: "sometimes_covered",
        explanation:
          "Relocation is covered when a documented safety need exists (e.g. protective order, DV escape). Keep receipts.",
      };
    }

    case "other":
    default:
      return {
        classification: "sometimes_covered",
        explanation:
          "Coverage depends on specific circumstances. Describe the expense and attach documentation.",
      };
  }
}
