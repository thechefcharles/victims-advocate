/**
 * Phase 4: Record sensitive profile changes — audit always; optional unresolved flag for admin org list.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/server/logging";

const JSONISH_PATCH_COLUMNS = new Set(["coverage_area", "hours", "metadata"]);

function cloneForAudit(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return String(value);
  }
}

function fieldSnapshot(
  key: string,
  beforeRow: Record<string, unknown>,
  afterRow: Record<string, unknown>
): { before: unknown; after: unknown } {
  const before = beforeRow[key];
  const after = afterRow[key];
  if (JSONISH_PATCH_COLUMNS.has(key)) {
    return { before: cloneForAudit(before), after: cloneForAudit(after) };
  }
  if (Array.isArray(before) || Array.isArray(after)) {
    return {
      before: Array.isArray(before) ? [...before] : before,
      after: Array.isArray(after) ? [...after] : after,
    };
  }
  return { before, after };
}

export function buildSensitiveProfileUpdateSnapshots(
  sensitiveKeys: readonly string[],
  beforeRow: Record<string, unknown>,
  afterRow: Record<string, unknown>
): Record<string, { before: unknown; after: unknown }> {
  const out: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of sensitiveKeys) {
    if (!Object.prototype.hasOwnProperty.call(beforeRow, key)) continue;
    out[key] = fieldSnapshot(key, beforeRow, afterRow);
  }
  return out;
}

export async function insertUnresolvedSensitiveProfileFlag(params: {
  supabase: SupabaseClient;
  organizationId: string;
  fieldsChanged: string[];
}): Promise<void> {
  const { supabase, organizationId, fieldsChanged } = params;
  const { error } = await supabase.from("organization_profile_flags").insert({
    organization_id: organizationId,
    flag_type: "sensitive_change",
    resolved: false,
    metadata: { fields_changed: fieldsChanged },
  });
  if (error) {
    logger.warn("org.profile.flag.insert_failed", {
      message: error.message,
      organizationId,
    });
  }
}
