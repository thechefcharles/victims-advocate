/**
 * Phase 8: Intake field response state – answered, skipped, deferred, amended.
 * Stored in case.application._fieldState for backward compatibility (no new columns).
 */

export type FieldStatus = "answered" | "skipped" | "deferred" | "amended";

export type AnsweredBy = "user" | "advocate";

export interface FieldStateEntry {
  status: FieldStatus;
  question_id?: string; // same as fieldKey for now
  answered_at?: string; // ISO
  answered_by?: AnsweredBy;
  amendment_reason?: string | null;
  previous_value?: unknown; // only when status === "amended"
}

/** Key used inside application JSON to store per-field state. Must not conflict with CompensationApplication keys. */
export const FIELD_STATE_KEY = "_fieldState" as const;

export type FieldStateMap = Record<string, FieldStateEntry>;

/** Stored application = CompensationApplication + optional _fieldState (server/client agree on shape). */
export type StoredApplication = Record<string, unknown> & {
  _fieldState?: FieldStateMap;
};

/**
 * Get the _fieldState object from a stored application. Never mutates.
 * Returns empty object if missing (backward compat).
 */
export function getFieldStateMap(app: StoredApplication): FieldStateMap {
  const raw = app[FIELD_STATE_KEY];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as FieldStateMap;
  return {};
}

/**
 * Get state for one field. Returns undefined if not set (legacy = treat as unanswered or infer from value).
 */
export function getFieldState(
  app: StoredApplication,
  fieldKey: string
): FieldStateEntry | undefined {
  return getFieldStateMap(app)[fieldKey];
}

/**
 * Infer status for a field from stored application (backward compat).
 * - If _fieldState[fieldKey] exists, use it.
 * - Else: if value is non-empty → "answered"; else → "unanswered" (not stored).
 */
export function getEffectiveStatus(
  app: StoredApplication,
  fieldKey: string,
  currentValue: unknown
): FieldStatus | "unanswered" {
  const entry = getFieldState(app, fieldKey);
  if (entry) return entry.status;
  const empty =
    currentValue === undefined ||
    currentValue === null ||
    (typeof currentValue === "string" && currentValue.trim() === "") ||
    (Array.isArray(currentValue) && currentValue.length === 0);
  return empty ? "unanswered" : "answered";
}

/**
 * Set one field's state and return a new _fieldState map (does not mutate app).
 */
export function setFieldState(
  currentMap: FieldStateMap,
  fieldKey: string,
  entry: FieldStateEntry
): FieldStateMap {
  return { ...currentMap, [fieldKey]: entry };
}

/**
 * Remove _fieldState from application for PDF/export. Returns clean CompensationApplication-like object.
 */
export function stripFieldState(app: StoredApplication): Record<string, unknown> {
  const out = { ...app };
  delete out[FIELD_STATE_KEY];
  return out;
}

/**
 * Merge _fieldState into application for save. Use when building payload from form app + fieldState.
 */
export function mergeFieldState(
  app: Record<string, unknown>,
  fieldState: FieldStateMap
): StoredApplication {
  if (Object.keys(fieldState).length === 0) return app as StoredApplication;
  return { ...app, [FIELD_STATE_KEY]: fieldState } as StoredApplication;
}

/**
 * Build FieldStateEntry for skip.
 */
export function makeSkippedEntry(answeredBy: AnsweredBy = "user"): FieldStateEntry {
  return {
    status: "skipped",
    answered_at: new Date().toISOString(),
    answered_by: answeredBy,
  };
}

/**
 * Build FieldStateEntry for defer.
 */
export function makeDeferredEntry(answeredBy: AnsweredBy = "user"): FieldStateEntry {
  return {
    status: "deferred",
    answered_at: new Date().toISOString(),
    answered_by: answeredBy,
  };
}

/**
 * Build FieldStateEntry for amendment (preserve previous value).
 */
export function makeAmendedEntry(
  previousValue: unknown,
  reason: string,
  answeredBy: AnsweredBy = "advocate"
): FieldStateEntry {
  return {
    status: "amended",
    answered_at: new Date().toISOString(),
    answered_by: answeredBy,
    amendment_reason: reason,
    previous_value: previousValue,
  };
}

/**
 * Build FieldStateEntry for answered (user or advocate).
 */
export function makeAnsweredEntry(answeredBy: AnsweredBy = "user"): FieldStateEntry {
  return {
    status: "answered",
    answered_at: new Date().toISOString(),
    answered_by: answeredBy,
  };
}
