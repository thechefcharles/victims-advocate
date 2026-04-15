/**
 * Domain 2.5 — Intake answer normalization.
 *
 * Bridges the legacy nested `LegacyIntakePayload` shape and the
 * intake-v2 flat `Record<field_key, value>` shape. Consumers that need to
 * read intake answers should call `normalizeIntakeAnswers` first and use
 * `getAnswerValue` for safe key lookup.
 *
 * The flat key namespace mirrors the dotted `intake_field_path` values on
 * `form_alignment_mappings`. Conversion rule:
 *   "victim.firstName" → "victim_first_name"
 *   (camelCase split + lowercase + dot/space → underscore)
 * The same rule lives in `pdfIngestionService.normalizePdfFieldName` so a
 * field added via PDF ingestion lines up with a legacy nested path.
 */

import type { LegacyIntakePayload } from "@/lib/archive/compensationSchema.legacy";

export type LegacyIntakeAnswers = Partial<LegacyIntakePayload>;
export type V2IntakeAnswers = Record<string, unknown>;
export type NormalizedAnswers = Record<string, unknown>;

export type IntakeAnswerVersion = "v1" | "v2";

/**
 * Normalize "victim.firstName" → "victim_first_name". Kept in sync with
 * the PDF ingestion normalizer so v1 leaf paths and v2 field_keys collide
 * deterministically.
 */
export function normalizeKey(path: string): string {
  if (!path) return "";
  const camelSplit = path
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2");
  return camelSplit
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}

/**
 * Walks the legacy nested object and emits one entry per primitive leaf
 * keyed on the normalized dotted path. Arrays are emitted whole — the
 * v1 schema uses arrays for `medical.providers[]`, `funeral.payments[]`,
 * etc., and downstream consumers either inspect the first element or
 * accept the array as-is. Objects are recursed.
 */
function flattenLegacy(
  value: unknown,
  prefix: string,
  out: NormalizedAnswers,
): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    out[normalizeKey(prefix)] = value;
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${k}` : k;
      flattenLegacy(v, next, out);
    }
    return;
  }
  out[normalizeKey(prefix)] = value;
}

/**
 * Heuristic detector. Used only when the caller doesn't know the version.
 * v2 answers are flat — no nested object values for known top-level
 * legacy groups. If we see a `victim` or `losses` object at the top level
 * it's v1.
 */
export function detectAnswerVersion(
  answers: LegacyIntakeAnswers | V2IntakeAnswers,
): IntakeAnswerVersion {
  if (!answers || typeof answers !== "object") return "v2";
  const a = answers as Record<string, unknown>;
  for (const k of [
    "victim",
    "applicant",
    "contact",
    "crime",
    "losses",
    "medical",
    "employment",
    "funeral",
    "certification",
  ]) {
    const v = a[k];
    if (v && typeof v === "object" && !Array.isArray(v)) return "v1";
  }
  return "v2";
}

/**
 * Returns a flat `Record<field_key, value>` regardless of input shape.
 *
 * v1: walks the nested LegacyIntakePayload, emitting one key per leaf.
 *     Top-level leaf paths and nested paths coexist (e.g. both
 *     `victim_first_name` and `losses_medical_hospital`).
 * v2: passes through after a key-normalization pass (defensive — keys are
 *     expected to be snake_case already).
 */
export function normalizeIntakeAnswers(
  answers: LegacyIntakeAnswers | V2IntakeAnswers | null | undefined,
  version: IntakeAnswerVersion,
): NormalizedAnswers {
  if (!answers || typeof answers !== "object") return {};
  if (version === "v2") {
    const out: NormalizedAnswers = {};
    for (const [k, v] of Object.entries(answers as Record<string, unknown>)) {
      const key = normalizeKey(k);
      if (key) out[key] = v;
    }
    return out;
  }
  const out: NormalizedAnswers = {};
  flattenLegacy(answers, "", out);
  return out;
}

/** Safe accessor — returns undefined instead of throwing on missing keys. */
export function getAnswerValue(answers: NormalizedAnswers, fieldKey: string): unknown {
  if (!answers || typeof answers !== "object") return undefined;
  const direct = answers[fieldKey];
  if (direct !== undefined) return direct;
  // Tolerate callers that pass the dotted legacy path by mistake.
  const norm = normalizeKey(fieldKey);
  return norm === fieldKey ? undefined : answers[norm];
}
