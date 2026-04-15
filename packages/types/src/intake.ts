/**
 * Public intake-v2 types — session shape + template field schema.
 */

export type {
  IntakeV2Status as IntakeV2SessionStatus,
  IntakeV2Session,
} from "@/lib/server/intakeV2/intakeV2Service";

export type {
  RenderField as IntakeField,
  RenderSection as IntakeSection,
  TemplateFieldsResponse,
} from "@/lib/server/intakeV2/templateFieldsService";
