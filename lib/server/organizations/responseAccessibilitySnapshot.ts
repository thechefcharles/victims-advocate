import { INTAKE_METHOD_OPTIONS } from "@/lib/organizations/profileOptions";
import type { ResponseAccessibilityPublic } from "@/lib/organizations/responseAccessibilityPublic";
import type { AccessibilityFeature, IntakeMethod } from "@/lib/server/organizations/types";

const INTAKE_LABELS: Record<string, string> = Object.fromEntries(
  INTAKE_METHOD_OPTIONS.map((k) => {
    const label = k
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return [k, label];
  })
);

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function asAccessibilityFeatures(v: unknown): AccessibilityFeature[] {
  const allowed = new Set<string>([
    "wheelchair_access",
    "interpreters",
    "virtual_services",
    "after_hours",
    "transportation_support",
  ]);
  return asStringArray(v).filter((x): x is AccessibilityFeature => allowed.has(x));
}

function parseHours24_7(hours: Record<string, unknown>): "yes" | "no" | "unknown" {
  if (!hours || typeof hours !== "object" || Array.isArray(hours)) return "unknown";
  const o = hours as Record<string, unknown>;
  if (o.open_24_7 === true || o.is_24_7 === true || o.twenty_four_seven === true) return "yes";
  if (o.open_24_7 === false || o.is_24_7 === false) return "no";
  if (typeof o.support_24_7 === "string" && /^(yes|y|true|24)/i.test(o.support_24_7.trim()))
    return "yes";
  if (typeof o.support_24_7 === "string" && /^(no|n|false)/i.test(o.support_24_7.trim())) return "no";
  const blob = JSON.stringify(hours).toLowerCase();
  if (blob.includes("24/7") || blob.includes("24-7")) return "yes";
  return "unknown";
}

function summarizeOperatingHours(hours: Record<string, unknown>): string {
  if (!hours || typeof hours !== "object" || Array.isArray(hours)) return "Not specified";
  const o = hours as Record<string, unknown>;
  if (typeof o.summary === "string" && o.summary.trim()) return o.summary.trim();
  if (typeof o.note === "string" && o.note.trim()) return o.note.trim();
  if (typeof o.text === "string" && o.text.trim()) return o.text.trim();
  const keys = Object.keys(hours).filter((k) => !k.startsWith("_"));
  if (keys.length === 0) return "Not specified";
  const raw = JSON.stringify(hours);
  return raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
}

function formatAvgResponseHours(h: number | null): string {
  if (h == null || !Number.isFinite(h)) return "Not listed";
  if (h <= 1) return "~1 hour (typical first response)";
  if (h < 48) return `~${Math.round(h)} hours (typical first response)`;
  if (h < 168) return `~${Math.round(h / 24)} days (typical first response)`;
  return `~${Math.round(h / 168)} weeks (typical first response)`;
}

export function buildResponseAccessibilitySnapshot(row: {
  languages?: unknown;
  intake_methods?: unknown;
  hours?: unknown;
  avg_response_time_hours?: unknown;
  accessibility_features?: unknown;
}): ResponseAccessibilityPublic {
  const langs = asStringArray(row.languages);
  const intakes = asStringArray(row.intake_methods).filter((x): x is IntakeMethod =>
    (INTAKE_METHOD_OPTIONS as readonly string[]).includes(x)
  );
  const hours =
    row.hours && typeof row.hours === "object" && !Array.isArray(row.hours)
      ? (row.hours as Record<string, unknown>)
      : {};
  const avgRaw = row.avg_response_time_hours;
  const avgNum =
    avgRaw != null && avgRaw !== "" && Number.isFinite(Number(avgRaw)) ? Number(avgRaw) : null;
  const features = asAccessibilityFeatures(row.accessibility_features);

  const h24 = parseHours24_7(hours);
  const support247 =
    h24 === "yes" ? "Yes" : h24 === "no" ? "No" : "Not specified";

  const intakeDisplay =
    intakes.length === 0
      ? "Not listed"
      : intakes.map((m) => INTAKE_LABELS[m] ?? m).join(", ");

  return {
    avg_response_time: formatAvgResponseHours(avgNum),
    support_24_7: support247,
    operating_hours: summarizeOperatingHours(hours),
    languages_count: langs.length === 0 ? "Not listed" : String(langs.length),
    ada_accommodations: features.includes("wheelchair_access")
      ? "Listed (wheelchair access)"
      : "Not listed on profile",
    interpretation: features.includes("interpreters") ? "Offered" : "Not listed on profile",
    remote_virtual: features.includes("virtual_services") ? "Offered" : "Not listed on profile",
    transportation: features.includes("transportation_support")
      ? "Offered"
      : "Not listed on profile",
    intake_methods: intakeDisplay,
    platform_measured_response: "Coming soon",
  };
}
