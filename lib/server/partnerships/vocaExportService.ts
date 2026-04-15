/**
 * Domain 7.5 — VOCA outcome reporting.
 *
 * Aggregates outcomes for funder reports across the requested grant year and
 * date window. Returns a structured object; UI/admin layer formats / exports
 * (CSV, PDF, etc.) downstream.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { AuthContext } from "@/lib/server/auth";

export interface VocaReportFilters {
  grantYear: string;
  organizationId?: string;
  dateRange: { start: string; end: string };
}

export interface VocaOutcomeReport {
  grantYear: string;
  organizationId: string | null;
  dateRange: { start: string; end: string };
  generatedAt: string;
  totals: {
    applicantsServed: number;
    applicationsSubmitted: number;
    applicationsApproved: number;
    referralsMade: number;
    organizationsServed: number;
  };
  servicesProvidedByCategory: Array<{ category: string; count: number }>;
  partnerships: Array<{
    organizationId: string;
    partnerType: string;
    partnerName: string | null;
    awardAmountCents: number | null;
    servicesFunded: string[] | null;
  }>;
}

function isoDate(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) {
    throw new AppError("VALIDATION_ERROR", `Invalid date: ${s}`, undefined, 422);
  }
  return s.slice(0, 10);
}

export async function generateVocaOutcomeReport(
  filters: VocaReportFilters,
  ctx: AuthContext,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<VocaOutcomeReport> {
  if (!ctx.isAdmin) {
    throw new AppError("FORBIDDEN", "Admin only.", undefined, 403);
  }
  if (!filters.grantYear?.trim()) {
    throw new AppError("VALIDATION_ERROR", "grantYear required.", undefined, 422);
  }
  const start = isoDate(filters.dateRange.start);
  const end = isoDate(filters.dateRange.end);
  if (end < start) {
    throw new AppError("VALIDATION_ERROR", "dateRange.end before start.", undefined, 422);
  }
  const startTs = `${start}T00:00:00Z`;
  const endTs = `${end}T23:59:59Z`;
  const orgFilter = filters.organizationId ?? null;

  // Partnerships in scope for this grant year.
  let partnershipsQ = supabase
    .from("org_partnerships")
    .select(
      "organization_id, partner_type, partner_name, voca_award_amount_cents, voca_services_funded",
    )
    .eq("voca_grant_year", filters.grantYear)
    .in("partnership_status", ["active", "expired", "under_renewal"]);
  if (orgFilter) partnershipsQ = partnershipsQ.eq("organization_id", orgFilter);
  const { data: partnerships, error: pErr } = await partnershipsQ;
  if (pErr) throw new AppError("INTERNAL", pErr.message, undefined, 500);

  const partnershipRows = (partnerships ?? []) as Array<{
    organization_id: string;
    partner_type: string;
    partner_name: string | null;
    voca_award_amount_cents: number | null;
    voca_services_funded: string[] | null;
  }>;
  const orgScope = orgFilter
    ? [orgFilter]
    : Array.from(new Set(partnershipRows.map((r) => r.organization_id)));

  // intake_submissions: applicants served + applications submitted.
  let submissionsQ = supabase
    .from("intake_submissions")
    .select("id, applicant_id, status, organization_id, submitted_at, created_at")
    .gte("created_at", startTs)
    .lte("created_at", endTs);
  if (orgScope.length > 0) submissionsQ = submissionsQ.in("organization_id", orgScope);
  const { data: submissions, error: sErr } = await submissionsQ;
  if (sErr) throw new AppError("INTERNAL", sErr.message, undefined, 500);
  const subRows = (submissions ?? []) as Array<{
    id: string;
    applicant_id: string | null;
    status: string;
    organization_id: string | null;
    submitted_at: string | null;
  }>;
  const applicantsServed = new Set(subRows.map((r) => r.applicant_id).filter(Boolean)).size;
  const applicationsSubmitted = subRows.filter(
    (r) => r.status === "submitted" || r.status === "locked",
  ).length;

  // cases: applications approved.
  let casesQ = supabase
    .from("cases")
    .select("id, status, organization_id, outcome_recorded_at, updated_at")
    .eq("status", "approved")
    .gte("updated_at", startTs)
    .lte("updated_at", endTs);
  if (orgScope.length > 0) casesQ = casesQ.in("organization_id", orgScope);
  const { data: cases, error: cErr } = await casesQ;
  if (cErr) throw new AppError("INTERNAL", cErr.message, undefined, 500);
  const applicationsApproved = (cases ?? []).length;

  // referrals: count of referrals originated by scope orgs in window.
  let referralsQ = supabase
    .from("referrals")
    .select("id, source_organization_id, created_at")
    .gte("created_at", startTs)
    .lte("created_at", endTs);
  if (orgScope.length > 0) referralsQ = referralsQ.in("source_organization_id", orgScope);
  const { data: referrals, error: rErr } = await referralsQ;
  if (rErr) throw new AppError("INTERNAL", rErr.message, undefined, 500);
  const referralsMade = (referrals ?? []).length;

  // trust_signal_aggregates: services provided per signal_type.
  let aggQ = supabase
    .from("trust_signal_aggregates")
    .select("org_id, signal_type, total_count");
  if (orgScope.length > 0) aggQ = aggQ.in("org_id", orgScope);
  const { data: aggregates, error: aErr } = await aggQ;
  if (aErr) throw new AppError("INTERNAL", aErr.message, undefined, 500);
  const byCategory = new Map<string, number>();
  for (const row of (aggregates ?? []) as Array<{
    signal_type: string;
    total_count: number | null;
  }>) {
    const key = row.signal_type;
    byCategory.set(key, (byCategory.get(key) ?? 0) + (row.total_count ?? 0));
  }
  const servicesProvidedByCategory = Array.from(byCategory.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const report: VocaOutcomeReport = {
    grantYear: filters.grantYear,
    organizationId: orgFilter,
    dateRange: { start, end },
    generatedAt: new Date().toISOString(),
    totals: {
      applicantsServed,
      applicationsSubmitted,
      applicationsApproved,
      referralsMade,
      organizationsServed: orgScope.length,
    },
    servicesProvidedByCategory,
    partnerships: partnershipRows.map((p) => ({
      organizationId: p.organization_id,
      partnerType: p.partner_type,
      partnerName: p.partner_name,
      awardAmountCents: p.voca_award_amount_cents,
      servicesFunded: p.voca_services_funded,
    })),
  };

  await logEvent({
    ctx,
    action: "voca.outcome_report_generated",
    resourceType: "voca_report",
    resourceId: null,
    organizationId: orgFilter,
    metadata: {
      grant_year: filters.grantYear,
      date_range: { start, end },
      orgs_in_scope: orgScope.length,
    },
  });
  return report;
}
