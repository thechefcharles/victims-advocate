/**
 * Domain 6.1 — Score dispute service.
 *
 * Lifecycle:
 *   open  →  under_review  →  resolved  →  closed
 *
 * Resolving a dispute does NOT mutate the disputed snapshot. The outcome
 * field captures whether the score was affirmed, recomputed (a new
 * snapshot was created via `recalculateProviderScore`), or declined.
 * Snapshots are append-only history per the immutability trigger.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type {
  ScoreDispute,
  ScoreDisputeOutcome,
  ScoreDisputeStatus,
} from "./trustTypes";
import {
  getDisputeById,
  getSnapshotById,
  insertDispute,
  updateDispute,
} from "./trustRepository";

export interface CreateDisputeInput {
  organizationId: string;
  snapshotId: string;
  reason: string;
  evidence?: Record<string, unknown>;
  openedByUserId: string;
}

export async function createScoreDispute(
  input: CreateDisputeInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ScoreDispute> {
  if (!input.reason || input.reason.trim().length === 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Dispute reason is required.",
      undefined,
      422,
    );
  }
  // Confirm the snapshot exists and belongs to the org.
  const snapshot = await getSnapshotById(input.snapshotId, supabase);
  if (!snapshot) {
    throw new AppError(
      "NOT_FOUND",
      "Snapshot not found.",
      undefined,
      404,
    );
  }
  if (snapshot.organizationId !== input.organizationId) {
    throw new AppError(
      "FORBIDDEN",
      "Snapshot does not belong to this organization.",
      undefined,
      403,
    );
  }
  return insertDispute(
    {
      organizationId: input.organizationId,
      snapshotId: input.snapshotId,
      status: "open",
      reason: input.reason,
      evidence: input.evidence ?? {},
      openedByUserId: input.openedByUserId,
    },
    supabase,
  );
}

const DISPUTE_TRANSITIONS: Record<ScoreDisputeStatus, ScoreDisputeStatus[]> = {
  open: ["under_review", "closed"],
  under_review: ["resolved", "closed"],
  resolved: ["closed"],
  closed: [],
};

function assertDisputeTransition(
  from: ScoreDisputeStatus,
  to: ScoreDisputeStatus,
): void {
  const allowed = DISPUTE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot transition dispute from '${from}' to '${to}'.`,
      undefined,
      422,
    );
  }
}

export interface ReviewDisputeInput {
  disputeId: string;
  reviewerUserId: string;
  toStatus: ScoreDisputeStatus;
  resolutionNotes?: string;
  resolutionOutcome?: ScoreDisputeOutcome;
}

export async function reviewScoreDispute(
  input: ReviewDisputeInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ScoreDispute> {
  const existing = await getDisputeById(input.disputeId, supabase);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Dispute not found.", undefined, 404);
  }
  assertDisputeTransition(existing.status, input.toStatus);
  return updateDispute(
    input.disputeId,
    {
      status: input.toStatus,
      reviewedByUserId: input.reviewerUserId,
      reviewedAt: new Date().toISOString(),
      resolutionNotes: input.resolutionNotes ?? null,
      resolutionOutcome: input.resolutionOutcome ?? null,
    },
    supabase,
  );
}
