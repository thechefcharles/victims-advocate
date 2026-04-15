/**
 * Domain 6.1 — 30-day private review window.
 *
 * When a new summary row is written, the review window starts: the score is
 * visible to the owning org privately, but NEVER to the public or to other
 * orgs, until either 30 days pass or the org explicitly acknowledges.
 *
 * This module owns:
 *   - startReviewWindow(orgId)     — set when aggregationWorker writes a new summary
 *   - acknowledgePublicDisplay(…)  — org flips its own row public early
 *   - activateExpiredReviews()     — cron: flip public for any expired window
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";

export const REVIEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function buildReviewWindowColumns(): {
  public_display_active: boolean;
  private_review_expires_at: string;
  acknowledged_at: null;
} {
  return {
    public_display_active: false,
    private_review_expires_at: new Date(Date.now() + REVIEW_WINDOW_MS).toISOString(),
    acknowledged_at: null,
  };
}

export async function acknowledgePublicDisplay(
  organizationId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ publicDisplayActive: boolean }> {
  const { data, error } = await supabase
    .from("trust_signal_summary")
    .update({
      public_display_active: true,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .select("public_display_active")
    .maybeSingle();
  if (error) {
    throw new AppError("INTERNAL", "Failed to acknowledge score.", undefined, 500);
  }
  if (!data) {
    throw new AppError("NOT_FOUND", "No score exists for this organization yet.", undefined, 404);
  }
  return { publicDisplayActive: Boolean((data as { public_display_active: boolean }).public_display_active) };
}

export async function activateExpiredReviews(
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ activated: number }> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("trust_signal_summary")
    .update({ public_display_active: true })
    .eq("public_display_active", false)
    .lt("private_review_expires_at", nowIso)
    .select("organization_id");
  if (error) return { activated: 0 };
  return { activated: (data ?? []).length };
}
