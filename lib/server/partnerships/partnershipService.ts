/**
 * Domain 7.5 — Org Partnerships service.
 *
 * MOUs, referral agreements, VOCA grants, hospital MOUs, COUs, law-enforcement
 * MOUs. Status transitions are validated server-side; every transition emits
 * an AuditEvent.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { AuthContext } from "@/lib/server/auth";

export type PartnerType =
  | "mou"
  | "referral_agreement"
  | "voca_subgrant"
  | "voca_direct"
  | "hospital_mou"
  | "cou"
  | "law_enforcement_mou"
  | "other";

export type PartnershipStatus =
  | "pending"
  | "active"
  | "expired"
  | "terminated"
  | "under_renewal";

export interface OrgPartnership {
  id: string;
  organization_id: string;
  partner_type: PartnerType;
  partnership_status: PartnershipStatus;
  partner_name: string | null;
  partner_organization_id: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  auto_renew: boolean;
  voca_grant_year: string | null;
  voca_award_amount_cents: number | null;
  voca_services_funded: string[] | null;
  bedside_intake_enabled: boolean;
  bedside_location_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePartnershipInput {
  organizationId: string;
  partnerType: PartnerType;
  partnershipStatus: PartnershipStatus;
  partnerName?: string | null;
  partnerOrganizationId?: string | null;
  effectiveDate?: string | null;
  expirationDate?: string | null;
  autoRenew?: boolean;
  vocaGrantYear?: string | null;
  vocaAwardAmountCents?: number | null;
  vocaServicesFunded?: string[] | null;
  bedsideIntakeEnabled?: boolean;
  bedsideLocationName?: string | null;
  notes?: string | null;
}

// Allowed transitions for partnership_status. `expired` is only set by the
// renewal cron / system, never by an interactive PATCH.
const VALID_TRANSITIONS: Record<PartnershipStatus, PartnershipStatus[]> = {
  pending: ["active", "terminated"],
  active: ["under_renewal", "terminated", "expired"],
  under_renewal: ["active", "terminated"],
  expired: [],
  terminated: [],
};

function isMember(ctx: AuthContext, orgId: string): boolean {
  return ctx.orgId === orgId;
}

export async function getOrgPartnerships(
  orgId: string,
  ctx: AuthContext,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<OrgPartnership[]> {
  if (!ctx.isAdmin && !isMember(ctx, orgId)) {
    throw new AppError("FORBIDDEN", "Not a member of this organization.", undefined, 403);
  }
  const { data, error } = await supabase
    .from("org_partnerships")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("INTERNAL", error.message, undefined, 500);
  return (data ?? []) as OrgPartnership[];
}

export async function createPartnership(
  ctx: AuthContext,
  input: CreatePartnershipInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<OrgPartnership> {
  if (!ctx.isAdmin) {
    throw new AppError("FORBIDDEN", "Admin only.", undefined, 403);
  }
  if (!input.organizationId) {
    throw new AppError("VALIDATION_ERROR", "organizationId required.", undefined, 422);
  }
  const row = {
    organization_id: input.organizationId,
    partner_type: input.partnerType,
    partnership_status: input.partnershipStatus,
    partner_name: input.partnerName ?? null,
    partner_organization_id: input.partnerOrganizationId ?? null,
    effective_date: input.effectiveDate ?? null,
    expiration_date: input.expirationDate ?? null,
    auto_renew: input.autoRenew ?? false,
    voca_grant_year: input.vocaGrantYear ?? null,
    voca_award_amount_cents: input.vocaAwardAmountCents ?? null,
    voca_services_funded: input.vocaServicesFunded ?? null,
    bedside_intake_enabled: input.bedsideIntakeEnabled ?? false,
    bedside_location_name: input.bedsideLocationName ?? null,
    notes: input.notes ?? null,
    created_by: ctx.userId,
  };
  const { data, error } = await supabase
    .from("org_partnerships")
    .insert(row)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", error?.message ?? "Insert failed.", undefined, 500);
  }
  const created = data as OrgPartnership;

  await logEvent({
    ctx,
    action: "partnership.created",
    resourceType: "org_partnership",
    resourceId: created.id,
    organizationId: created.organization_id,
    metadata: {
      partner_type: created.partner_type,
      partnership_status: created.partnership_status,
      voca_grant_year: created.voca_grant_year,
    },
  });
  return created;
}

export async function updatePartnershipStatus(
  ctx: AuthContext,
  partnershipId: string,
  nextStatus: PartnershipStatus,
  reason: string | null,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<OrgPartnership> {
  if (!ctx.isAdmin) {
    throw new AppError("FORBIDDEN", "Admin only.", undefined, 403);
  }
  const { data: current, error: readErr } = await supabase
    .from("org_partnerships")
    .select("*")
    .eq("id", partnershipId)
    .maybeSingle();
  if (readErr) throw new AppError("INTERNAL", readErr.message, undefined, 500);
  if (!current) throw new AppError("NOT_FOUND", "Partnership not found.", undefined, 404);

  const currentRow = current as OrgPartnership;
  const allowed = VALID_TRANSITIONS[currentRow.partnership_status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid transition: ${currentRow.partnership_status} -> ${nextStatus}.`,
      { from: currentRow.partnership_status, to: nextStatus, allowed },
      422,
    );
  }

  const { data: updated, error: updateErr } = await supabase
    .from("org_partnerships")
    .update({ partnership_status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", partnershipId)
    .select("*")
    .single();
  if (updateErr || !updated) {
    throw new AppError("INTERNAL", updateErr?.message ?? "Update failed.", undefined, 500);
  }
  const updatedRow = updated as OrgPartnership;

  await logEvent({
    ctx,
    action: "partnership.status_changed",
    resourceType: "org_partnership",
    resourceId: updatedRow.id,
    organizationId: updatedRow.organization_id,
    metadata: {
      from: currentRow.partnership_status,
      to: nextStatus,
      reason: reason ?? null,
    },
  });
  return updatedRow;
}

export async function getExpiringPartnerships(
  daysAhead: number,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<OrgPartnership[]> {
  if (!Number.isFinite(daysAhead) || daysAhead < 0) {
    throw new AppError("VALIDATION_ERROR", "daysAhead must be a non-negative number.", undefined, 422);
  }
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() + Math.floor(daysAhead));
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("org_partnerships")
    .select("*")
    .eq("partnership_status", "active")
    .not("expiration_date", "is", null)
    .gte("expiration_date", todayIso)
    .lte("expiration_date", cutoffIso)
    .order("expiration_date", { ascending: true });
  if (error) throw new AppError("INTERNAL", error.message, undefined, 500);
  return (data ?? []) as OrgPartnership[];
}
