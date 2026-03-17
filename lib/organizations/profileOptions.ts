/** Shared org profile enums (client + server). */

export const SERVICE_TYPE_OPTIONS = [
  "victim_compensation",
  "legal_aid",
  "therapy",
  "case_management",
  "housing_support",
  "emergency_funds",
  "hospital_advocacy",
] as const;

export const INTAKE_METHOD_OPTIONS = [
  "phone",
  "walk_in",
  "online_form",
  "referral_only",
  "email",
] as const;

export const SPECIAL_POPULATION_OPTIONS = [
  "children",
  "domestic_violence",
  "sexual_assault",
  "homicide_survivors",
  "immigrant_clients",
  "spanish_speaking",
] as const;

export const ACCESSIBILITY_FEATURE_OPTIONS = [
  "wheelchair_access",
  "interpreters",
  "virtual_services",
  "after_hours",
  "transportation_support",
] as const;

export const CAPACITY_STATUS_OPTIONS = [
  "open",
  "limited",
  "waitlist",
  "closed",
  "unknown",
] as const;

export const PROFILE_STATUS_OPTIONS = ["draft", "active", "archived"] as const;
