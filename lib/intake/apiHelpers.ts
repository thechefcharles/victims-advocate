/**
 * Phase 8: Shared helpers for intake API routes – parse application, update case.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { StoredApplication } from "./fieldState";

export type CaseRow = Record<string, unknown>;

/** Parse application from case row (may be string or object). */
export function parseApplicationFromCase(caseRow: CaseRow): StoredApplication | null {
  const raw = caseRow?.application;
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null) return raw as StoredApplication;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? (parsed as StoredApplication) : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Update case application in DB. Returns updated case row or throws. */
export async function updateCaseApplication(
  caseId: string,
  application: StoredApplication
): Promise<CaseRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cases")
    .update({
      application: typeof application === "string" ? application : JSON.stringify(application),
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId)
    .select("*")
    .single();
  if (error) throw error;
  return data as CaseRow;
}
