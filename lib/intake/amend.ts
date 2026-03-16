/**
 * Phase 8: Server-side intake amendment – preserve prior value, require reason, audit.
 */

import type { AuthContext } from "@/lib/server/auth";
import {
  getFieldStateMap,
  setFieldState,
  makeAmendedEntry,
  stripFieldState,
  mergeFieldState,
  type StoredApplication,
  type FieldStateMap,
} from "./fieldState";

/** Get value at dot path (e.g. "crime.crimeDescription"). */
export function getNested(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const p of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return current;
}

/** Set value at dot path; mutates obj. Returns previous value. */
export function setNested(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): unknown {
  const parts = path.split(".");
  if (parts.length === 0) return undefined;
  const last = parts.pop()!;
  let current: Record<string, unknown> = obj;
  for (const p of parts) {
    let next = current[p];
    if (next == null || typeof next !== "object") {
      next = {};
      current[p] = next;
    }
    current = next as Record<string, unknown>;
  }
  const previous = current[last];
  current[last] = value;
  return previous;
}

export type AmendIntakeFieldParams = {
  caseId: string;
  fieldKey: string;
  newValue: unknown;
  reason: string;
  ctx: AuthContext;
  /** Current application object (with or without _fieldState). */
  application: StoredApplication;
};

export type AmendIntakeFieldResult = {
  application: StoredApplication;
  previousValue: unknown;
};

/**
 * Amend one intake field: set new value, preserve previous in _fieldState, set status = amended.
 * Does not persist to DB or log – caller does that.
 */
export function amendIntakeField(params: AmendIntakeFieldParams): AmendIntakeFieldResult {
  const { fieldKey, newValue, reason, application } = params;
  const appCopy = JSON.parse(JSON.stringify(application)) as StoredApplication;
  const clean = stripFieldState(appCopy) as Record<string, unknown>;
  const previousValue = getNested(clean, fieldKey);
  setNested(clean, fieldKey, newValue);
  const stateMap = getFieldStateMap(appCopy);
  const newState = setFieldState(
    stateMap,
    fieldKey,
    makeAmendedEntry(previousValue, reason, "advocate")
  );
  const applicationOut = mergeFieldState(clean, newState);
  return { application: applicationOut, previousValue };
}
