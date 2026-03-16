/**
 * Phase 8: High-sensitivity and skip/defer config per intake field.
 * Kept in schema/config, not only in UI.
 */

export interface FieldConfig {
  /** Question is high-sensitivity: show safe-mode copy and allow defer. */
  is_high_sensitivity: boolean;
  /** User can choose "Skip for now". */
  allow_skip: boolean;
  /** User can choose "Answer later" (defer). */
  allow_defer: boolean;
  /** i18n key for safe-mode helper text (e.g. "intake.safeMode.takeYourTime"). */
  safe_mode_copy_key?: string;
  /** Optional inline safe-mode copy if no i18n. */
  safe_mode_copy?: string;
}

/** Canonical field keys used in _fieldState and review. Dot path in application (e.g. crime.crimeDescription). */
export const INTAKE_FIELD_KEYS = [
  // Victim
  "victim.firstName",
  "victim.lastName",
  "victim.dateOfBirth",
  "victim.streetAddress",
  "victim.city",
  "victim.state",
  "victim.zip",
  "victim.email",
  "victim.cellPhone",
  // Applicant
  "applicant.isSameAsVictim",
  "applicant.firstName",
  "applicant.lastName",
  "applicant.relationshipToVictim",
  // Crime – high sensitivity
  "crime.dateOfCrime",
  "crime.dateReported",
  "crime.crimeAddress",
  "crime.crimeCity",
  "crime.crimeCounty",
  "crime.reportingAgency",
  "crime.policeReportNumber",
  "crime.crimeDescription",
  "crime.injuryDescription",
  "crime.offenderKnown",
  "crime.offenderNames",
  "crime.offenderRelationship",
  "crime.sexualAssaultKitPerformed",
] as const;

export type IntakeFieldKey = (typeof INTAKE_FIELD_KEYS)[number];

const DEFAULT_CONFIG: FieldConfig = {
  is_high_sensitivity: false,
  allow_skip: false,
  allow_defer: false,
};

/** High-sensitivity fields: violent event details, injury, sexual assault, loss/death. */
const HIGH_SENSITIVITY_CONFIG: Partial<Record<string, FieldConfig>> = {
  "crime.crimeDescription": {
    is_high_sensitivity: true,
    allow_skip: true,
    allow_defer: true,
    safe_mode_copy_key: "intake.safeMode.crimeDescription",
  },
  "crime.injuryDescription": {
    is_high_sensitivity: true,
    allow_skip: true,
    allow_defer: true,
    safe_mode_copy_key: "intake.safeMode.injuryDescription",
  },
  "crime.offenderNames": {
    is_high_sensitivity: true,
    allow_skip: true,
    allow_defer: true,
    safe_mode_copy_key: "intake.safeMode.optionalDetail",
  },
  "crime.offenderRelationship": {
    is_high_sensitivity: true,
    allow_skip: true,
    allow_defer: true,
    safe_mode_copy_key: "intake.safeMode.optionalDetail",
  },
  "crime.sexualAssaultKitPerformed": {
    is_high_sensitivity: true,
    allow_skip: true,
    allow_defer: true,
    safe_mode_copy_key: "intake.safeMode.optionalDetail",
  },
};

/**
 * Get config for a field. Returns default (no skip/defer) if not configured.
 */
export function getFieldConfig(fieldKey: string): FieldConfig {
  const c = HIGH_SENSITIVITY_CONFIG[fieldKey];
  if (c) return { ...DEFAULT_CONFIG, ...c };
  return { ...DEFAULT_CONFIG };
}

/**
 * Whether this field is high-sensitivity (show safe-mode UI).
 */
export function isHighSensitivity(fieldKey: string): boolean {
  return getFieldConfig(fieldKey).is_high_sensitivity;
}

/**
 * Whether user can skip this field.
 */
export function canSkip(fieldKey: string): boolean {
  return getFieldConfig(fieldKey).allow_skip;
}

/**
 * Whether user can defer this field.
 */
export function canDefer(fieldKey: string): boolean {
  return getFieldConfig(fieldKey).allow_defer;
}
