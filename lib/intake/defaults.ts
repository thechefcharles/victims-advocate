// lib/intake/defaults.ts
import type { CaseData } from "./types";

export const CASE_DEFAULTS: CaseData = {
  victim: {
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    address1: "",
    city: "",
    state: "IL",
    zip: "",
    hasDisability: "unknown",
  },
  applicant: {
    isVictimAlsoApplicant: "yes",
  },
  crime: {
    policeReported: "unknown",
    offenderKnown: "unknown",
  },
  losses: {},
  medical: {},
  employment: {},
  funeral: {},
  documents: { uploads: {} },
  completedSteps: {},
};