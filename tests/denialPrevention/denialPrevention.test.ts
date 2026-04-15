/**
 * Domain 5.3 — Denial Prevention Engine tests.
 *
 * Covers the 5 scenarios called out in the spec plus roll-up correctness
 * and reminder schedule shape.
 */

import { describe, it, expect } from "vitest";
import {
  runDenialCheck,
  classifyExpense,
  buildReminderSchedule,
  type DenialCheckInput,
} from "@/lib/server/denialPrevention";

function baseInput(overrides: Partial<DenialCheckInput> = {}): DenialCheckInput {
  return {
    stateCode: "IL",
    now: new Date("2026-04-15T00:00:00Z"),
    cooperationAnswered: true,
    policeReportNumberProvided: true,
    contributoryConductFlag: false,
    crimeDate: "2025-10-15",
    filingDeadlineDays: 730,
    reportDate: "2025-10-15T02:00:00Z",
    reportDeadlineDays: 72,
    crimeType: "domestic_violence",
    policeReportException: null,
    crimeCoveredByCvca: true,
    filerType: "self_filing_adult",
    allowedFilerTypes: [
      "self_filing_adult",
      "eligible_applicant_own_expenses",
      "guardian_or_rep",
      "third_party_expense_payer",
    ],
    hasInsuranceClaim: false,
    hasMedicaidClaim: false,
    hasWorkerCompClaim: false,
    collateralCoordinationDocumented: false,
    expenseCategoriesClaimed: ["medical_hospital"],
    documentedExpenseCategories: ["medical_hospital"],
    crimeDocUploaded: true,
    requiredFieldsMissing: [],
    ineligibleExpenseCategoriesClaimed: [],
    disqualifyingFelonyFlag: false,
    requiresSubrogation: true,
    subrogationSigned: true,
    requiresReleaseOfInfo: true,
    releaseOfInfoSigned: true,
    alternateVerificationProvided: false,
    ...overrides,
  };
}

describe("Denial prevention — 13 category checks", () => {
  it("clean application passes all checks with overall risk = low", () => {
    const result = runDenialCheck(baseInput());
    expect(result.overallRiskLevel).toBe("low");
    expect(result.blockingCategories).toEqual([]);
    expect(result.passedAll).toBe(true);
  });

  it("filing deadline past 730 days → BLOCKING", () => {
    const result = runDenialCheck(
      baseInput({
        crimeDate: "2023-04-01", // > 730 days ago from 2026-04-15
      }),
    );
    expect(result.overallRiskLevel).toBe("blocking");
    expect(result.blockingCategories).toContain(3);
  });

  it("filing deadline within 30 days → HIGH", () => {
    const result = runDenialCheck(
      baseInput({
        crimeDate: "2024-04-25", // ~720 days ago from 2026-04-15
      }),
    );
    const cat3 = result.checks.find((c) => c.category === 3);
    expect(cat3?.severity).toBe("HIGH");
  });

  it("missing required authorizations (IL) → BLOCKING", () => {
    const result = runDenialCheck(
      baseInput({
        requiresSubrogation: true,
        subrogationSigned: false,
        requiresReleaseOfInfo: true,
        releaseOfInfoSigned: false,
      }),
    );
    expect(result.overallRiskLevel).toBe("blocking");
    expect(result.blockingCategories).toContain(13);
  });

  it("ineligible expense categories claimed → HIGH", () => {
    const result = runDenialCheck(
      baseInput({
        ineligibleExpenseCategoriesClaimed: ["property_damage", "pain_and_suffering"],
      }),
    );
    const cat11 = result.checks.find((c) => c.category === 11);
    expect(cat11?.severity).toBe("HIGH");
    expect(result.overallRiskLevel).not.toBe("low");
  });

  it("required fields missing → WARNING or HIGH by count", () => {
    const many = runDenialCheck(
      baseInput({ requiredFieldsMissing: ["crime_date", "address", "dob"] }),
    );
    expect(many.checks.find((c) => c.category === 10)?.severity).toBe("HIGH");

    const few = runDenialCheck(baseInput({ requiredFieldsMissing: ["dob"] }));
    expect(few.checks.find((c) => c.category === 10)?.severity).toBe("WARNING");
  });

  it("collateral sources with no coordination documented → HIGH", () => {
    const result = runDenialCheck(
      baseInput({
        hasInsuranceClaim: true,
        collateralCoordinationDocumented: false,
      }),
    );
    expect(result.checks.find((c) => c.category === 7)?.severity).toBe("HIGH");
  });

  it("police-report exception (IN SA forensic exam) passes category 4 despite late report", () => {
    const result = runDenialCheck(
      baseInput({
        stateCode: "IN",
        crimeType: "sexual_assault",
        reportDate: "2025-11-01T00:00:00Z", // two weeks late
        crimeDate: "2025-10-15",
        policeReportException: {
          crimeType: "sexual_assault",
          alternateVerification: "forensic_exam",
        },
        alternateVerificationProvided: true,
      }),
    );
    expect(result.checks.find((c) => c.category === 4)?.severity).toBe("PASS");
  });
});

describe("Payor-of-last-resort classifier", () => {
  it("property_damage → not_covered", () => {
    const r = classifyExpense("property_damage", {
      hasInsurance: false,
      insurancePaid: false,
      medicaidCovered: false,
      workerCompCovered: false,
    });
    expect(r.classification).toBe("not_covered");
  });

  it("pain_and_suffering → not_covered", () => {
    const r = classifyExpense("pain_and_suffering", {
      hasInsurance: false,
      insurancePaid: false,
      medicaidCovered: false,
      workerCompCovered: false,
    });
    expect(r.classification).toBe("not_covered");
  });

  it("medical_hospital with insurance paid → payor_of_last_resort_required", () => {
    const r = classifyExpense("medical_hospital", {
      hasInsurance: true,
      insurancePaid: true,
      medicaidCovered: false,
      workerCompCovered: false,
    });
    expect(r.classification).toBe("payor_of_last_resort_required");
    expect(r.explanation).toContain("insurance");
  });

  it("medical_hospital with no collateral → covered", () => {
    const r = classifyExpense("medical_hospital", {
      hasInsurance: false,
      insurancePaid: false,
      medicaidCovered: false,
      workerCompCovered: false,
    });
    expect(r.classification).toBe("covered");
  });

  it("lost_wages with worker comp covered → not_covered", () => {
    const r = classifyExpense("lost_wages", {
      hasInsurance: false,
      insurancePaid: false,
      medicaidCovered: false,
      workerCompCovered: true,
    });
    expect(r.classification).toBe("not_covered");
  });

  it("mental_health → covered", () => {
    const r = classifyExpense("mental_health", {
      hasInsurance: false,
      insurancePaid: false,
      medicaidCovered: false,
      workerCompCovered: false,
    });
    expect(r.classification).toBe("covered");
  });
});

describe("Reminder schedule shape", () => {
  it("creates exactly 3 reminders per missing item at 7/14/21 days", () => {
    const now = new Date("2026-04-15T00:00:00Z");
    const reminders = buildReminderSchedule(["medical_bill", "police_report"], now);
    expect(reminders.length).toBe(6);

    const perItem = reminders.filter((r) => r.missingItem === "medical_bill");
    expect(perItem.length).toBe(3);
    expect(perItem.map((r) => r.reminderType).sort()).toEqual([
      "day_14",
      "day_21",
      "day_7",
    ]);

    const day7 = perItem.find((r) => r.reminderType === "day_7");
    const day14 = perItem.find((r) => r.reminderType === "day_14");
    const day21 = perItem.find((r) => r.reminderType === "day_21");
    const day = 24 * 60 * 60 * 1000;
    expect(
      new Date(day7!.scheduledFor).getTime() - now.getTime(),
    ).toBe(7 * day);
    expect(
      new Date(day14!.scheduledFor).getTime() - now.getTime(),
    ).toBe(14 * day);
    expect(
      new Date(day21!.scheduledFor).getTime() - now.getTime(),
    ).toBe(21 * day);
  });

  it("empty missing-items list produces zero reminders", () => {
    expect(buildReminderSchedule([]).length).toBe(0);
  });
});
