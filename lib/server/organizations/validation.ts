import { AppError } from "@/lib/server/api";
import type {
  AccessibilityFeature,
  CapacityStatus,
  IntakeMethod,
  OrgProfileStage,
  OrgProfileStatus,
  OrganizationProfile,
  ServiceType,
  SpecialPopulation,
} from "./types";
import {
  ACCESSIBILITY_FEATURES,
  INTAKE_METHODS,
  SERVICE_TYPES,
  SPECIAL_POPULATIONS,
} from "./types";

function dedupeTrim(arr: unknown, allowed?: readonly string[]): string[] {
  if (!Array.isArray(arr)) return [];
  const set = new Set<string>();
  for (const v of arr) {
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) continue;
    if (allowed && !allowed.includes(s)) continue;
    set.add(s);
  }
  return Array.from(set);
}

function parseLanguages(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of input) {
    const s = String(v ?? "").trim().toLowerCase();
    if (!s || s.length > 12) continue;
    if (!/^[a-z]{2}(-[a-z]{2,4})?$/.test(s)) continue;
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

function parseJsonObject(input: unknown, field: string): Record<string, unknown> {
  if (input == null || input === "") return {};
  if (typeof input === "object" && !Array.isArray(input) && input !== null) {
    return input as Record<string, unknown>;
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      throw new AppError("VALIDATION_ERROR", `Invalid JSON for ${field}`, undefined, 422);
    }
  }
  throw new AppError("VALIDATION_ERROR", `${field} must be a JSON object`, undefined, 422);
}

const CAPACITY: CapacityStatus[] = ["open", "limited", "waitlist", "closed", "unknown"];
const PROFILE_STATUS: OrgProfileStatus[] = ["draft", "active", "archived"];

export function parseCapacityStatus(v: unknown): CapacityStatus {
  const s = String(v ?? "unknown").trim().toLowerCase();
  return CAPACITY.includes(s as CapacityStatus) ? (s as CapacityStatus) : "unknown";
}

export function parseProfileStatus(v: unknown): OrgProfileStatus {
  const s = String(v ?? "draft").trim().toLowerCase();
  if (!PROFILE_STATUS.includes(s as OrgProfileStatus)) {
    throw new AppError("VALIDATION_ERROR", "Invalid profile_status", undefined, 422);
  }
  return s as OrgProfileStatus;
}

export function parseOrgProfilePatch(body: Record<string, unknown>): Partial<OrganizationProfile> {
  const patch: Partial<OrganizationProfile> = {};

  if (body.service_types !== undefined) {
    patch.service_types = dedupeTrim(
      body.service_types,
      SERVICE_TYPES as unknown as string[]
    ) as ServiceType[];
  }
  if (body.languages !== undefined) {
    patch.languages = parseLanguages(body.languages);
  }
  if (body.coverage_area !== undefined) {
    patch.coverage_area = parseJsonObject(body.coverage_area, "coverage_area");
  }
  if (body.intake_methods !== undefined) {
    patch.intake_methods = dedupeTrim(
      body.intake_methods,
      INTAKE_METHODS as unknown as string[]
    ) as IntakeMethod[];
  }
  if (body.hours !== undefined) {
    patch.hours = parseJsonObject(body.hours, "hours");
  }
  if (body.accepting_clients !== undefined) {
    patch.accepting_clients = Boolean(body.accepting_clients);
  }
  if (body.capacity_status !== undefined) {
    patch.capacity_status = parseCapacityStatus(body.capacity_status);
  }
  if (body.avg_response_time_hours !== undefined) {
    if (body.avg_response_time_hours === null) {
      patch.avg_response_time_hours = null;
    } else {
      const n = Number(body.avg_response_time_hours);
      if (!Number.isFinite(n) || n < 0 || n > 8760) {
        throw new AppError("VALIDATION_ERROR", "avg_response_time_hours must be 0–8760 or null", undefined, 422);
      }
      patch.avg_response_time_hours = Math.round(n);
    }
  }
  if (body.special_populations !== undefined) {
    patch.special_populations = dedupeTrim(
      body.special_populations,
      SPECIAL_POPULATIONS as unknown as string[]
    ) as SpecialPopulation[];
  }
  if (body.accessibility_features !== undefined) {
    patch.accessibility_features = dedupeTrim(
      body.accessibility_features,
      ACCESSIBILITY_FEATURES as unknown as string[]
    ) as AccessibilityFeature[];
  }
  if (body.profile_status !== undefined) {
    patch.profile_status = parseProfileStatus(body.profile_status);
  }

  return patch;
}

function coerceProfileStatus(v: unknown): OrgProfileStatus {
  const s = String(v ?? "draft").trim().toLowerCase();
  return PROFILE_STATUS.includes(s as OrgProfileStatus) ? (s as OrgProfileStatus) : "draft";
}

const PROFILE_STAGES: OrgProfileStage[] = ["created", "searchable", "enriched"];

function coerceProfileStage(v: unknown): OrgProfileStage {
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v === 1) return "created";
    if (v === 2 || v === 3) return "searchable";
    if (v === 4) return "enriched";
  }
  const s = String(v ?? "created").trim().toLowerCase();
  if (PROFILE_STAGES.includes(s as OrgProfileStage)) return s as OrgProfileStage;
  if (s === "1") return "created";
  if (s === "2" || s === "3") return "searchable";
  if (s === "4") return "enriched";
  return "created";
}

export function rowToOrganizationProfile(row: Record<string, unknown>): OrganizationProfile {
  const st = new Set(SERVICE_TYPES as unknown as string[]);
  const im = new Set(INTAKE_METHODS as unknown as string[]);
  const sp = new Set(SPECIAL_POPULATIONS as unknown as string[]);
  const af = new Set(ACCESSIBILITY_FEATURES as unknown as string[]);

  const serviceTypes = (Array.isArray(row.service_types) ? row.service_types : [])
    .map((x) => String(x).trim().toLowerCase())
    .filter((x) => st.has(x)) as ServiceType[];
  const intake = (Array.isArray(row.intake_methods) ? row.intake_methods : [])
    .map((x) => String(x).trim().toLowerCase())
    .filter((x) => im.has(x)) as IntakeMethod[];
  const spec = (Array.isArray(row.special_populations) ? row.special_populations : [])
    .map((x) => String(x).trim().toLowerCase())
    .filter((x) => sp.has(x)) as SpecialPopulation[];
  const acc = (Array.isArray(row.accessibility_features) ? row.accessibility_features : [])
    .map((x) => String(x).trim().toLowerCase())
    .filter((x) => af.has(x)) as AccessibilityFeature[];

  return {
    service_types: serviceTypes,
    languages: parseLanguages(row.languages ?? []),
    coverage_area:
      row.coverage_area && typeof row.coverage_area === "object" && !Array.isArray(row.coverage_area)
        ? (row.coverage_area as Record<string, unknown>)
        : {},
    intake_methods: intake,
    hours:
      row.hours && typeof row.hours === "object" && !Array.isArray(row.hours)
        ? (row.hours as Record<string, unknown>)
        : {},
    accepting_clients: Boolean(row.accepting_clients),
    capacity_status: parseCapacityStatus(row.capacity_status),
    avg_response_time_hours:
      row.avg_response_time_hours == null || row.avg_response_time_hours === ""
        ? null
        : Number.isFinite(Number(row.avg_response_time_hours))
          ? Math.round(Number(row.avg_response_time_hours))
          : null,
    special_populations: spec,
    accessibility_features: acc,
    profile_status: coerceProfileStatus(row.profile_status),
    profile_stage: coerceProfileStage(row.profile_stage),
    profile_last_updated_at:
      row.profile_last_updated_at != null ? String(row.profile_last_updated_at) : null,
  };
}
