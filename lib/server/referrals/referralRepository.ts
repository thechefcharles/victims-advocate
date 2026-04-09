/**
 * Domain 4.1 — Referral repository.
 * All DB access for referrals, referral_share_packages, referral_events.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type { ReferralRow, ReferralSharePackageRow, ReferralEventRow, ReferralEventType, ReferralDomainStatus } from "./referralTypes";

function asReferralRow(r: Record<string, unknown>): ReferralRow {
  return {
    id: r.id as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    source_organization_id: r.source_organization_id as string,
    target_organization_id: r.target_organization_id as string,
    applicant_id: r.applicant_id as string,
    initiated_by: r.initiated_by as string,
    case_id: (r.case_id as string | null) ?? null,
    support_request_id: (r.support_request_id as string | null) ?? null,
    status: r.status as ReferralDomainStatus,
    reason: (r.reason as string | null) ?? null,
    consent_grant_id: (r.consent_grant_id as string | null) ?? null,
    responded_at: (r.responded_at as string | null) ?? null,
    responded_by: (r.responded_by as string | null) ?? null,
  };
}

export async function getReferralById(id: string): Promise<ReferralRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", "Referral lookup failed", undefined, 500);
  return data ? asReferralRow(data as Record<string, unknown>) : null;
}

export async function listReferralsForSourceOrg(organizationId: string): Promise<ReferralRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("source_organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("INTERNAL", "Failed to list referrals for source org", undefined, 500);
  return (data ?? []).map((r) => asReferralRow(r as Record<string, unknown>));
}

export async function listReferralsForTargetOrg(organizationId: string): Promise<ReferralRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("target_organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("INTERNAL", "Failed to list referrals for target org", undefined, 500);
  return (data ?? []).map((r) => asReferralRow(r as Record<string, unknown>));
}

export async function listReferralsForApplicantSafeView(applicantId: string): Promise<ReferralRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("applicant_id", applicantId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("INTERNAL", "Failed to list referrals for applicant", undefined, 500);
  return (data ?? []).map((r) => asReferralRow(r as Record<string, unknown>));
}

export async function createReferral(params: {
  source_organization_id: string;
  target_organization_id: string;
  applicant_id: string;
  initiated_by: string;
  case_id?: string | null;
  support_request_id?: string | null;
  reason?: string | null;
}): Promise<ReferralRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("referrals")
    .insert({ ...params, status: "draft" })
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to create referral", undefined, 500);
  return asReferralRow(data as Record<string, unknown>);
}

export async function updateReferralStatus(params: {
  id: string;
  status: string;
  respondedBy?: string | null;
  consentGrantId?: string | null;
}): Promise<ReferralRow> {
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = { status: params.status };
  if (params.respondedBy) {
    update.responded_at = new Date().toISOString();
    update.responded_by = params.respondedBy;
  }
  if (params.consentGrantId) {
    update.consent_grant_id = params.consentGrantId;
  }
  const { data, error } = await supabase
    .from("referrals")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to update referral status", undefined, 500);
  return asReferralRow(data as Record<string, unknown>);
}

export async function createReferralSharePackage(params: {
  referral_id: string;
  prepared_by: string;
  consent_grant_id?: string | null;
  package_type?: string;
  scoped_data?: Record<string, unknown>;
  doc_ids?: string[];
}): Promise<ReferralSharePackageRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("referral_share_packages")
    .insert({
      referral_id: params.referral_id,
      prepared_by: params.prepared_by,
      consent_grant_id: params.consent_grant_id ?? null,
      package_type: params.package_type ?? "basic",
      scoped_data: params.scoped_data ?? {},
      doc_ids: params.doc_ids ?? [],
    })
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to create referral share package", undefined, 500);
  return data as ReferralSharePackageRow;
}

export async function getReferralSharePackageByReferralId(
  referralId: string,
): Promise<ReferralSharePackageRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("referral_share_packages")
    .select("*")
    .eq("referral_id", referralId)
    .order("prepared_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", "Failed to get referral share package", undefined, 500);
  return data as ReferralSharePackageRow | null;
}

export async function recordReferralEvent(params: {
  referral_id: string;
  event_type: ReferralEventType;
  actor_id: string;
  metadata?: Record<string, unknown>;
}): Promise<ReferralEventRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("referral_events")
    .insert({
      referral_id: params.referral_id,
      event_type: params.event_type,
      actor_id: params.actor_id,
      metadata: params.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to record referral event", undefined, 500);
  return data as ReferralEventRow;
}
