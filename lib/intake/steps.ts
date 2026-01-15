// lib/intake/steps.ts
export type IntakeStepKey =
  | "victim"
  | "applicant"
  | "crime"
  | "losses"
  | "medical"
  | "employment"
  | "funeral"
  | "documents"
  | "summary";

export const INTAKE_STEPS: { key: IntakeStepKey; path: (caseId: string) => string; labelKey: string }[] =
  [
    { key: "victim", path: (id) => `/intake/${id}/victim`, labelKey: "intake.steps.victim" },
    { key: "applicant", path: (id) => `/intake/${id}/applicant`, labelKey: "intake.steps.applicant" },
    { key: "crime", path: (id) => `/intake/${id}/crime`, labelKey: "intake.steps.crime" },
    { key: "losses", path: (id) => `/intake/${id}/losses`, labelKey: "intake.steps.losses" },
    { key: "medical", path: (id) => `/intake/${id}/medical`, labelKey: "intake.steps.medical" },
    { key: "employment", path: (id) => `/intake/${id}/employment`, labelKey: "intake.steps.employment" },
    { key: "funeral", path: (id) => `/intake/${id}/funeral`, labelKey: "intake.steps.funeral" },
    { key: "documents", path: (id) => `/intake/${id}/documents`, labelKey: "intake.steps.documents" },
    { key: "summary", path: (id) => `/intake/${id}/summary`, labelKey: "intake.steps.summary" },
  ];

  export function stepHref(caseId: string, step: IntakeStepKey): string {
  const found = INTAKE_STEPS.find((s) => s.key === step);
  return found ? found.path(caseId) : `/intake/${caseId}/victim`;
}

export function nextStep(current: IntakeStepKey): IntakeStepKey | null {
  const idx = INTAKE_STEPS.findIndex((s) => s.key === current);
  if (idx < 0) return null;
  const nxt = INTAKE_STEPS[idx + 1];
  return nxt ? nxt.key : null;
}