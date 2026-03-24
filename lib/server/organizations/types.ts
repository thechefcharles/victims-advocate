import {
  ACCESSIBILITY_FEATURE_OPTIONS,
  INTAKE_METHOD_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  SPECIAL_POPULATION_OPTIONS,
} from "@/lib/organizations/profileOptions";

export type CapacityStatus = "open" | "limited" | "waitlist" | "closed" | "unknown";
export type OrgProfileStatus = "draft" | "active" | "archived";
export type OrgProfileStage = "created" | "searchable" | "enriched";

export const SERVICE_TYPES = SERVICE_TYPE_OPTIONS;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const INTAKE_METHODS = INTAKE_METHOD_OPTIONS;
export type IntakeMethod = (typeof INTAKE_METHODS)[number];

export const SPECIAL_POPULATIONS = SPECIAL_POPULATION_OPTIONS;
export type SpecialPopulation = (typeof SPECIAL_POPULATIONS)[number];

export const ACCESSIBILITY_FEATURES = ACCESSIBILITY_FEATURE_OPTIONS;
export type AccessibilityFeature = (typeof ACCESSIBILITY_FEATURES)[number];

export type OrganizationProfile = {
  service_types: ServiceType[];
  languages: string[];
  coverage_area: Record<string, unknown>;
  intake_methods: IntakeMethod[];
  hours: Record<string, unknown>;
  accepting_clients: boolean;
  capacity_status: CapacityStatus;
  avg_response_time_hours: number | null;
  special_populations: SpecialPopulation[];
  accessibility_features: AccessibilityFeature[];
  profile_status: OrgProfileStatus;
  profile_stage: OrgProfileStage;
  profile_last_updated_at: string | null;
};

export type OrganizationProfileRow = OrganizationProfile & {
  id: string;
  name: string;
  type: string;
  status: string;
  metadata: Record<string, unknown>;
};
