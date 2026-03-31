/**
 * Phase 7: Case timeline – append-only operational history.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { getCaseById } from "./cases";

export type TimelineEventRow = {
  id: string;
  created_at: string;
  case_id: string;
  organization_id: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
};

export type AppendTimelineParams = {
  caseId: string;
  organizationId: string | null;
  actor: { userId: string; role?: string } | null;
  eventType: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Append a timeline event. Call from server only; does not check auth (caller must have already verified).
 */
export async function appendCaseTimelineEvent(params: AppendTimelineParams): Promise<void> {
  const { caseId, organizationId, actor, eventType, title, description = null, metadata = {} } = params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("case_timeline_events").insert({
    case_id: caseId,
    organization_id: organizationId,
    actor_user_id: actor?.userId ?? null,
    actor_role: actor?.role ?? null,
    event_type: eventType,
    title,
    description,
    metadata,
  });
  if (error) throw new AppError("INTERNAL", "Failed to append timeline event", undefined, 500);
}

/**
 * List case timeline. Enforces case access. For victims (role owner), note-related events are redacted.
 */
export async function listCaseTimeline(params: {
  caseId: string;
  ctx: AuthContext;
}): Promise<TimelineEventRow[]> {
  const { caseId, ctx } = params;
  const result = await getCaseById({ caseId, ctx });
  if (!result) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("case_timeline_events")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) throw new AppError("INTERNAL", "Failed to list timeline", undefined, 500);

  const rows = (data ?? []) as TimelineEventRow[];
  const isVictim = result.access.role === "owner";

  if (!isVictim) return rows;

  return rows.map((e) => {
    if (e.event_type === "case.note_added" || e.event_type === "case.note_edited") {
      return {
        ...e,
        title: "Internal note added",
        description: null,
        metadata: {},
      };
    }
    return e;
  });
}
