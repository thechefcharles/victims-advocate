/**
 * Domain 6.1 — SignalDispute service.
 *
 * Lifecycle:
 *   submitted → under_review → resolved_upheld | resolved_annotated
 *                              | resolved_removed | closed
 *
 * Rules:
 *   - Provider may only submit disputes for signals belonging to their org.
 *   - One live dispute per signal_event_id (DB unique + recheck in service).
 *   - Signals are NEVER edited — `resolved_removed` inserts a
 *     signal_event_exclusions row; the aggregator anti-joins against it.
 *   - On `resolved_removed`, recalculateProviderScore is triggered so the
 *     new snapshot reflects the exclusion immediately.
 *   - Every step writes both a governance AuditEvent AND a per-dispute
 *     signal_dispute_audit_events row.
 *   - `adminNotes` are internal. Provider-facing serializer strips them.
 *   - SLA: 30 days from submission. checkSlaEscalations flags overdue reviews.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { logAuditEvent } from "@/lib/server/governance/auditService";
import { refreshAggregates } from "@/lib/server/trustSignal/signalAggregator";
import { createNotification } from "@/lib/server/notifications/create";
import { recalculateProviderScore } from "./providerScoreService";
import type {
  SignalDispute,
  SignalDisputeAdminView,
  SignalDisputeOutcome,
  SignalDisputeProviderView,
} from "./signalDisputeTypes";

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function rowToDispute(row: Record<string, unknown>): SignalDispute {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    signalEventId: String(row.signal_event_id),
    status: row.status as SignalDispute["status"],
    submittedBy: String(row.submitted_by),
    assignedTo: row.assigned_to != null ? String(row.assigned_to) : null,
    providerExplanation: String(row.provider_explanation),
    evidenceUrls: Array.isArray(row.evidence_urls) ? (row.evidence_urls as string[]) : [],
    resolutionReason: row.resolution_reason != null ? String(row.resolution_reason) : null,
    adminNotes: row.admin_notes != null ? String(row.admin_notes) : null,
    slaDeadline: String(row.sla_deadline),
    slaEscalated: Boolean(row.sla_escalated),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function serializeForProvider(d: SignalDispute): SignalDisputeProviderView {
  return {
    id: d.id,
    organizationId: d.organizationId,
    signalEventId: d.signalEventId,
    status: d.status,
    providerExplanation: d.providerExplanation,
    evidenceUrls: d.evidenceUrls,
    resolutionReason: d.resolutionReason,
    slaDeadline: d.slaDeadline,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function serializeForAdmin(d: SignalDispute): SignalDisputeAdminView {
  return d;
}

// ---------------------------------------------------------------------------
// Actor context (lightweight — avoids coupling to AuthContext here)
// ---------------------------------------------------------------------------

export interface DisputeActor {
  userId: string;
  accountType: string;
  organizationId: string | null;
  isAdmin: boolean;
}

function requireAdmin(actor: DisputeActor): void {
  if (!actor.isAdmin) {
    throw new AppError("FORBIDDEN", "Admin access required.", undefined, 403);
  }
}

// ---------------------------------------------------------------------------
// submitDispute
// ---------------------------------------------------------------------------

export async function submitDispute(
  actor: DisputeActor,
  input: {
    signalEventId: string;
    explanation: string;
    evidenceUrls?: string[];
  },
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<SignalDispute> {
  if (!input.signalEventId) {
    throw new AppError("VALIDATION_ERROR", "signalEventId is required.", undefined, 422);
  }
  if (!input.explanation || input.explanation.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "Dispute explanation is required.", undefined, 422);
  }

  // Load the signal to verify it exists and belongs to the actor's org.
  const { data: signal, error: sigErr } = await supabase
    .from("trust_signal_events")
    .select("id, org_id")
    .eq("id", input.signalEventId)
    .maybeSingle();
  if (sigErr) throw new AppError("INTERNAL", "Failed to load signal.", undefined, 500);
  if (!signal) throw new AppError("NOT_FOUND", "Signal not found.", undefined, 404);

  const signalOrgId = String((signal as Record<string, unknown>).org_id);
  if (!actor.isAdmin && actor.organizationId !== signalOrgId) {
    throw new AppError(
      "FORBIDDEN",
      "You may only dispute signals for your own organization.",
      undefined,
      403,
    );
  }

  const { data, error } = await supabase
    .from("signal_disputes")
    .insert({
      organization_id: signalOrgId,
      signal_event_id: input.signalEventId,
      status: "submitted",
      submitted_by: actor.userId,
      provider_explanation: input.explanation.trim(),
      evidence_urls: input.evidenceUrls ?? [],
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new AppError(
        "CONFLICT",
        "A dispute already exists for this signal.",
        undefined,
        409,
      );
    }
    throw new AppError("INTERNAL", "Failed to submit dispute.", undefined, 500);
  }

  const dispute = rowToDispute(data as Record<string, unknown>);

  await insertDisputeAuditRow(supabase, {
    dispute_id: dispute.id,
    event_type: "signal_dispute.submitted",
    actor_id: actor.userId,
    actor_role: actor.accountType,
    metadata: { signal_event_id: dispute.signalEventId },
  });
  void logAuditEvent(
    {
      actorId: actor.userId,
      tenantId: dispute.organizationId,
      action: "signal_dispute.submitted",
      resourceType: "signal_dispute",
      resourceId: dispute.id,
      eventCategory: "governance_change",
      metadata: { signal_event_id: dispute.signalEventId },
    },
    supabase,
  );

  // Fire-and-forget admin fan-out notification. A failure here never blocks
  // the dispute submission — submission already succeeded above.
  void notifyAdminsOfDispute(
    dispute.id,
    dispute.organizationId,
    dispute.signalEventId,
    supabase,
  );

  return dispute;
}

async function notifyAdminsOfDispute(
  disputeId: string,
  organizationId: string,
  signalEventId: string,
  supabase: SupabaseClient,
): Promise<void> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("is_admin", true);
    const adminIds = (data ?? [])
      .map((r) => (r as { user_id?: string }).user_id)
      .filter((x): x is string => typeof x === "string");
    for (const userId of adminIds) {
      await createNotification(
        {
          userId,
          organizationId,
          type: "dispute.submitted",
          title: "New signal dispute submitted",
          body: `Organization ${organizationId} submitted a dispute for signal ${signalEventId}.`,
          previewSafe: true,
          metadata: {
            dispute_id: disputeId,
            organization_id: organizationId,
            signal_event_id: signalEventId,
          },
        },
        null,
      ).catch(() => {
        /* best-effort per recipient */
      });
    }
  } catch {
    /* best-effort — never block dispute submission */
  }
}

// ---------------------------------------------------------------------------
// assignDispute
// ---------------------------------------------------------------------------

export async function assignDispute(
  actor: DisputeActor,
  disputeId: string,
  assigneeId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<SignalDispute> {
  requireAdmin(actor);
  if (!disputeId || !assigneeId) {
    throw new AppError("VALIDATION_ERROR", "disputeId and assigneeId are required.", undefined, 422);
  }

  const existing = await loadDispute(supabase, disputeId);
  if (existing.status !== "submitted" && existing.status !== "under_review") {
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot assign a dispute in status '${existing.status}'.`,
      undefined,
      422,
    );
  }

  const { data, error } = await supabase
    .from("signal_disputes")
    .update({ status: "under_review", assigned_to: assigneeId })
    .eq("id", disputeId)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to assign dispute.", undefined, 500);
  }
  const dispute = rowToDispute(data as Record<string, unknown>);

  await insertDisputeAuditRow(supabase, {
    dispute_id: dispute.id,
    event_type: "signal_dispute.assigned",
    actor_id: actor.userId,
    actor_role: actor.accountType,
    metadata: { assignee_id: assigneeId },
  });
  void logAuditEvent(
    {
      actorId: actor.userId,
      tenantId: dispute.organizationId,
      action: "signal_dispute.assigned",
      resourceType: "signal_dispute",
      resourceId: dispute.id,
      eventCategory: "governance_change",
      metadata: { assignee_id: assigneeId },
    },
    supabase,
  );

  return dispute;
}

// ---------------------------------------------------------------------------
// resolveDispute
// ---------------------------------------------------------------------------

const OUTCOMES: ReadonlyArray<SignalDisputeOutcome> = [
  "resolved_upheld",
  "resolved_annotated",
  "resolved_removed",
];

export async function resolveDispute(
  actor: DisputeActor,
  disputeId: string,
  input: {
    outcome: SignalDisputeOutcome;
    resolutionReason: string;
    adminNotes?: string;
  },
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<SignalDispute> {
  requireAdmin(actor);
  if (!OUTCOMES.includes(input.outcome)) {
    throw new AppError("VALIDATION_ERROR", "Invalid outcome.", undefined, 422);
  }
  if (!input.resolutionReason || input.resolutionReason.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "resolutionReason is required.", undefined, 422);
  }

  const existing = await loadDispute(supabase, disputeId);
  if (existing.status !== "under_review") {
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot resolve dispute from status '${existing.status}'; assign it first.`,
      undefined,
      422,
    );
  }

  const { data, error } = await supabase
    .from("signal_disputes")
    .update({
      status: input.outcome,
      resolution_reason: input.resolutionReason.trim(),
      admin_notes: input.adminNotes?.trim() ?? null,
    })
    .eq("id", disputeId)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to resolve dispute.", undefined, 500);
  }
  const dispute = rowToDispute(data as Record<string, unknown>);

  await insertDisputeAuditRow(supabase, {
    dispute_id: dispute.id,
    event_type: "signal_dispute.resolved",
    actor_id: actor.userId,
    actor_role: actor.accountType,
    metadata: { outcome: input.outcome },
  });
  void logAuditEvent(
    {
      actorId: actor.userId,
      tenantId: dispute.organizationId,
      action: "signal_dispute.resolved",
      resourceType: "signal_dispute",
      resourceId: dispute.id,
      eventCategory: "governance_change",
      metadata: { outcome: input.outcome },
    },
    supabase,
  );

  if (input.outcome === "resolved_removed") {
    // Append an exclusion row — signals themselves remain immutable per the
    // DO INSTEAD NOTHING rules on trust_signal_events. The aggregator
    // anti-joins against signal_event_exclusions to omit these from scoring.
    const { error: exErr } = await supabase.from("signal_event_exclusions").upsert(
      {
        signal_event_id: dispute.signalEventId,
        excluded_by_dispute_id: dispute.id,
        reason: "resolved_removed",
      },
      { onConflict: "signal_event_id" },
    );
    if (exErr) {
      throw new AppError("INTERNAL", "Failed to record exclusion.", undefined, 500);
    }

    await insertDisputeAuditRow(supabase, {
      dispute_id: dispute.id,
      event_type: "trust_signal.excluded_from_scoring",
      actor_id: actor.userId,
      actor_role: actor.accountType,
      metadata: { signal_event_id: dispute.signalEventId },
    });
    void logAuditEvent(
      {
        actorId: actor.userId,
        tenantId: dispute.organizationId,
        action: "trust_signal.excluded_from_scoring",
        resourceType: "trust_signal_event",
        resourceId: dispute.signalEventId,
        eventCategory: "governance_change",
        metadata: { dispute_id: dispute.id },
      },
      supabase,
    );

    // Refresh aggregates first so the exclusion is reflected in
    // trust_signal_aggregates before recompute reads them. Without this the
    // recompute would run against stale aggregates and only catch up on the
    // next signal emission.
    await refreshAggregates(dispute.organizationId, supabase);

    // Recompute the org's score so the excluded signal drops out of the
    // snapshot immediately. Fire-and-forget with an audit hook on completion.
    recalculateProviderScore({ organizationId: dispute.organizationId, supabase })
      .then(() => {
        void logAuditEvent(
          {
            actorId: actor.userId,
            tenantId: dispute.organizationId,
            action: "provider_score.recalculated",
            resourceType: "provider_score",
            resourceId: dispute.organizationId,
            eventCategory: "trust_scoring",
            metadata: { trigger: "signal_dispute_resolved_removed", dispute_id: dispute.id },
          },
          supabase,
        );
      })
      .catch(() => {
        /* non-fatal: the aggregator excludes the signal on next refresh */
      });
  }

  return dispute;
}

// ---------------------------------------------------------------------------
// checkSlaEscalations — background job hook
// ---------------------------------------------------------------------------

/**
 * Flags under_review disputes whose SLA deadline has passed, notifying senior
 * admin via audit hook. Safe to call repeatedly — the sla_escalated flag is
 * idempotent.
 */
export async function checkSlaEscalations(
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ escalated: number }> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("signal_disputes")
    .select("id, organization_id")
    .eq("status", "under_review")
    .eq("sla_escalated", false)
    .lt("sla_deadline", nowIso);

  if (error || !data) return { escalated: 0 };

  const rows = data as Array<{ id: string; organization_id: string }>;
  if (rows.length === 0) return { escalated: 0 };

  await supabase
    .from("signal_disputes")
    .update({ sla_escalated: true })
    .in(
      "id",
      rows.map((r) => r.id),
    );

  for (const row of rows) {
    await insertDisputeAuditRow(supabase, {
      dispute_id: row.id,
      event_type: "signal_dispute.sla_escalated",
      actor_id: null,
      actor_role: "system",
      metadata: { deadline_passed_at: nowIso },
    });
    void logAuditEvent(
      {
        actorId: "00000000-0000-0000-0000-000000000000",
        tenantId: row.organization_id,
        action: "signal_dispute.sla_escalated",
        resourceType: "signal_dispute",
        resourceId: row.id,
        eventCategory: "governance_change",
        metadata: { deadline_passed_at: nowIso },
      },
      supabase,
    );
  }

  return { escalated: rows.length };
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export async function listDisputesForOrg(
  actor: DisputeActor,
  organizationId: string,
  opts: { cursor?: string | null; limit?: number } = {},
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ disputes: SignalDisputeProviderView[]; nextCursor: string | null }> {
  if (!actor.isAdmin && actor.organizationId !== organizationId) {
    throw new AppError("FORBIDDEN", "Cross-tenant listing is not permitted.", undefined, 403);
  }
  const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
  let q = supabase
    .from("signal_disputes")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (opts.cursor) q = q.lt("id", opts.cursor);

  const { data, error } = await q;
  if (error) throw new AppError("INTERNAL", "Failed to list disputes.", undefined, 500);
  const rows = (data ?? []).map((r) => rowToDispute(r as Record<string, unknown>));
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    disputes: page.map(serializeForProvider),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function listDisputesForAdmin(
  actor: DisputeActor,
  opts: { status?: string; cursor?: string | null; limit?: number } = {},
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ disputes: SignalDisputeAdminView[]; nextCursor: string | null }> {
  requireAdmin(actor);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
  let q = supabase
    .from("signal_disputes")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.cursor) q = q.lt("id", opts.cursor);

  const { data, error } = await q;
  if (error) throw new AppError("INTERNAL", "Failed to list disputes.", undefined, 500);
  const rows = (data ?? []).map((r) => rowToDispute(r as Record<string, unknown>));
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    disputes: page.map(serializeForAdmin),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function loadDispute(
  supabase: SupabaseClient,
  disputeId: string,
): Promise<SignalDispute> {
  const { data, error } = await supabase
    .from("signal_disputes")
    .select("*")
    .eq("id", disputeId)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", "Failed to load dispute.", undefined, 500);
  if (!data) throw new AppError("NOT_FOUND", "Dispute not found.", undefined, 404);
  return rowToDispute(data as Record<string, unknown>);
}

async function insertDisputeAuditRow(
  supabase: SupabaseClient,
  row: {
    dispute_id: string;
    event_type: string;
    actor_id: string | null;
    actor_role: string;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("signal_dispute_audit_events").insert(row);
  if (error) {
    // Audit failures must not break the caller. Log silently.
    // eslint-disable-next-line no-console
    console.warn("signal_dispute_audit_events.insert failed", error.message);
  }
}
