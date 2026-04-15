/**
 * Domain 7.5 — Bedside intake eligibility.
 *
 * The bedside intake flow (hospital-based advocates filing on behalf of
 * patients) is gated on the org having an active partnership with
 * `bedside_intake_enabled = true`. This is a read-only check; the bedside
 * intake UI is a future sprint.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function checkBedsideIntakeEligibility(
  orgId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<boolean> {
  if (!orgId) return false;
  const { data, error } = await supabase
    .from("org_partnerships")
    .select("id")
    .eq("organization_id", orgId)
    .eq("partnership_status", "active")
    .eq("bedside_intake_enabled", true)
    .limit(1);
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}
