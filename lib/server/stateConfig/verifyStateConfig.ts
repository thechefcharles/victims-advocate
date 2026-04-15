/**
 * Domain 2.2 — Mark a state_workflow_configs row as human-verified.
 *
 * Used by ops after they review a training-knowledge-seeded row against
 * authoritative state CVC sources. Always operates on the most recent row
 * for the given state_code (active row if present, else newest by created_at).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { AuthContext } from "@/lib/server/auth";

export interface VerifyResult {
  id: string;
  stateCode: string;
  humanVerified: true;
  verifiedBy: string | null;
  verifiedAt: string;
}

export async function verifyStateConfig(
  ctx: AuthContext,
  stateCode: string,
  verificationNotes: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<VerifyResult> {
  if (!ctx.isAdmin) {
    throw new AppError("FORBIDDEN", "Admin only.", undefined, 403);
  }
  const code = (stateCode ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new AppError("VALIDATION_ERROR", "stateCode must be a 2-letter US state/DC code.", undefined, 422);
  }
  const notes = (verificationNotes ?? "").trim();
  if (!notes) {
    throw new AppError("VALIDATION_ERROR", "verificationNotes required.", undefined, 422);
  }

  // Resolve target row: prefer the active row, else the newest row.
  const { data: rows, error: readErr } = await supabase
    .from("state_workflow_configs")
    .select("id, state_code, status, human_verified")
    .eq("state_code", code)
    .order("status", { ascending: false }) // 'active' > 'draft' > 'deprecated' lex order ≠ priority, so resolve in JS
    .order("created_at", { ascending: false });
  if (readErr) throw new AppError("INTERNAL", readErr.message, undefined, 500);

  const list = (rows ?? []) as Array<{
    id: string;
    state_code: string;
    status: string;
    human_verified: boolean;
  }>;
  if (list.length === 0) {
    throw new AppError("NOT_FOUND", `No state_workflow_configs row for ${code}.`, undefined, 404);
  }
  const target = list.find((r) => r.status === "active") ?? list[0];

  const verifiedAt = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("state_workflow_configs")
    .update({
      human_verified: true,
      verified_by: ctx.userId,
      verified_at: verifiedAt,
      verification_notes: notes,
    })
    .eq("id", target.id);
  if (updateErr) throw new AppError("INTERNAL", updateErr.message, undefined, 500);

  await logEvent({
    ctx,
    action: "workflow.state_transition",
    resourceType: "state_workflow_config",
    resourceId: target.id,
    metadata: {
      verb: "state_config_verified",
      state_code: code,
      previously_verified: target.human_verified,
    },
  });

  return {
    id: target.id,
    stateCode: code,
    humanVerified: true,
    verifiedBy: ctx.userId,
    verifiedAt,
  };
}
