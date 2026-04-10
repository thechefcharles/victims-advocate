/**
 * Domain 2.1 — Intake: public surface.
 *
 * Import everything from here:
 *   import { startIntake, submitIntake } from "@/lib/server/intake"
 *   import type { IntakeApplicantView, ApplicantSearchProfile } from "@/lib/server/intake"
 *
 * Do NOT import directly from sub-files in new code.
 */

export {
  startIntake,
  saveIntakeDraft,
  submitIntake,
  getIntake,
  lockIntake,
  resumeIntake,
  validateIntakeStepForActor,
  amendIntakeSubmission,
} from "./intakeService";

export { buildSearchAttributesFromIntake } from "./buildSearchAttributesFromIntake";

export { serializeForApplicant, serializeForProvider } from "./intakeSerializer";

export type {
  IntakeSessionRecord,
  IntakeSubmissionRecord,
  IntakeAmendmentRecord,
  IntakeSessionStatus,
  IntakeApplicantView,
  IntakeProviderView,
  ApplicantSearchProfile,
  CreateIntakeSessionInput,
  SaveIntakeDraftInput,
  AmendIntakeSubmissionInput,
} from "./intakeTypes";
