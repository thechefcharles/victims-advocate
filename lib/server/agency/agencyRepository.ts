/**
 * Domain 6.2 — Agency repository.
 *
 * Single data-access layer for all agency tables. Services NEVER call
 * supabase directly. This module also reads from Domain 6.1 tables
 * (trust_signal_aggregates, provider_reliability_summaries) for
 * analytics — which is the correct consumption pattern (never ops tables).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import type {
  AdministeringAgency,
  AgencyMembership,
  AgencyNotice,
  AgencyNoticeType,
  AnalyticsSnapshot,
  AnalyticsSnapshotType,
  ReportingSubmission,
  ReportingSubmissionStatus,
} from "./agencyTypes";
import type { AgencyRole } from "@/lib/registry";

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToAgency(row: Record<string, unknown>): AdministeringAgency {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description != null ? String(row.description) : null,
    stateCode: String(row.state_code),
    scopeType: row.scope_type as AdministeringAgency["scopeType"],
    oversightOrgIds: Array.isArray(row.oversight_org_ids) ? (row.oversight_org_ids as string[]) : [],
    oversightProgramIds: Array.isArray(row.oversight_program_ids) ? (row.oversight_program_ids as string[]) : [],
    contactEmail: row.contact_email != null ? String(row.contact_email) : null,
    contactPhone: row.contact_phone != null ? String(row.contact_phone) : null,
    status: row.status as AdministeringAgency["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToMembership(row: Record<string, unknown>): AgencyMembership {
  return {
    id: String(row.id),
    agencyId: String(row.agency_id),
    userId: String(row.user_id),
    role: row.role as AgencyRole,
    status: row.status as AgencyMembership["status"],
    joinedAt: String(row.joined_at),
    removedAt: row.removed_at != null ? String(row.removed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToSubmission(row: Record<string, unknown>): ReportingSubmission {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    agencyId: String(row.agency_id),
    submittedByUserId: row.submitted_by_user_id != null ? String(row.submitted_by_user_id) : null,
    reviewedByUserId: row.reviewed_by_user_id != null ? String(row.reviewed_by_user_id) : null,
    status: row.status as ReportingSubmissionStatus,
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    reportingPeriodStart: String(row.reporting_period_start),
    reportingPeriodEnd: String(row.reporting_period_end),
    submissionData: (row.submission_data as Record<string, unknown>) ?? {},
    revisionReason: row.revision_reason != null ? String(row.revision_reason) : null,
    rejectionReason: row.rejection_reason != null ? String(row.rejection_reason) : null,
    submittedAt: row.submitted_at != null ? String(row.submitted_at) : null,
    reviewedAt: row.reviewed_at != null ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToNotice(row: Record<string, unknown>): AgencyNotice {
  return {
    id: String(row.id),
    agencyId: String(row.agency_id),
    targetOrganizationId: String(row.target_organization_id),
    noticeType: row.notice_type as AgencyNoticeType,
    subject: String(row.subject),
    body: String(row.body),
    relatedSubmissionId: row.related_submission_id != null ? String(row.related_submission_id) : null,
    issuedByUserId: String(row.issued_by_user_id),
    acknowledgedAt: row.acknowledged_at != null ? String(row.acknowledged_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToAnalyticsSnapshot(row: Record<string, unknown>): AnalyticsSnapshot {
  return {
    id: String(row.id),
    agencyId: String(row.agency_id),
    snapshotType: row.snapshot_type as AnalyticsSnapshotType,
    periodStart: String(row.period_start),
    periodEnd: String(row.period_end),
    data: (row.data as Record<string, unknown>) ?? {},
    computedAt: String(row.computed_at),
    createdAt: String(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Agency
// ---------------------------------------------------------------------------

export async function getAgencyById(
  id: string,
  supabase: SupabaseClient,
): Promise<AdministeringAgency | null> {
  const { data, error } = await supabase
    .from("administering_agencies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", `Failed to read agency: ${error.message}`);
  return data ? rowToAgency(data as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export async function getAgencyMembershipForUser(
  userId: string,
  supabase: SupabaseClient,
): Promise<AgencyMembership | null> {
  const { data, error } = await supabase
    .from("agency_memberships")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", `Failed to read agency membership: ${error.message}`);
  return data ? rowToMembership(data as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export async function insertSubmission(
  fields: Omit<ReportingSubmission, "id" | "createdAt" | "updatedAt" | "submittedAt" | "reviewedAt" | "reviewedByUserId" | "revisionReason" | "rejectionReason">,
  supabase: SupabaseClient,
): Promise<ReportingSubmission> {
  const { data, error } = await supabase
    .from("reporting_submissions")
    .insert({
      organization_id: fields.organizationId,
      agency_id: fields.agencyId,
      submitted_by_user_id: fields.submittedByUserId,
      status: fields.status,
      title: fields.title,
      description: fields.description,
      reporting_period_start: fields.reportingPeriodStart,
      reporting_period_end: fields.reportingPeriodEnd,
      submission_data: fields.submissionData,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to insert submission: ${error?.message ?? "no data"}`);
  }
  return rowToSubmission(data as Record<string, unknown>);
}

export async function getSubmissionById(
  id: string,
  supabase: SupabaseClient,
): Promise<ReportingSubmission | null> {
  const { data, error } = await supabase
    .from("reporting_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", `Failed to read submission: ${error.message}`);
  return data ? rowToSubmission(data as Record<string, unknown>) : null;
}

export async function updateSubmissionStatus(
  id: string,
  fields: {
    status: ReportingSubmissionStatus;
    reviewedByUserId?: string;
    revisionReason?: string;
    rejectionReason?: string;
    submittedByUserId?: string;
  },
  supabase: SupabaseClient,
): Promise<ReportingSubmission> {
  const updates: Record<string, unknown> = {
    status: fields.status,
    updated_at: new Date().toISOString(),
  };
  if (fields.status === "submitted") {
    updates.submitted_at = new Date().toISOString();
    if (fields.submittedByUserId) updates.submitted_by_user_id = fields.submittedByUserId;
  }
  if (fields.reviewedByUserId) {
    updates.reviewed_by_user_id = fields.reviewedByUserId;
    updates.reviewed_at = new Date().toISOString();
  }
  if (fields.revisionReason !== undefined) updates.revision_reason = fields.revisionReason;
  if (fields.rejectionReason !== undefined) updates.rejection_reason = fields.rejectionReason;

  const { data, error } = await supabase
    .from("reporting_submissions")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to update submission: ${error?.message ?? "no data"}`);
  }
  return rowToSubmission(data as Record<string, unknown>);
}

export async function listSubmissionsForOrg(
  organizationId: string,
  supabase: SupabaseClient,
): Promise<ReportingSubmission[]> {
  const { data, error } = await supabase
    .from("reporting_submissions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("INTERNAL", `Failed to list submissions: ${error.message}`);
  return (data ?? []).map((row) => rowToSubmission(row as Record<string, unknown>));
}

export async function listSubmissionsForAgency(
  agencyId: string,
  supabase: SupabaseClient,
): Promise<ReportingSubmission[]> {
  const { data, error } = await supabase
    .from("reporting_submissions")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("INTERNAL", `Failed to list agency submissions: ${error.message}`);
  return (data ?? []).map((row) => rowToSubmission(row as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

export async function insertNotice(
  fields: Omit<AgencyNotice, "id" | "createdAt" | "updatedAt" | "acknowledgedAt">,
  supabase: SupabaseClient,
): Promise<AgencyNotice> {
  const { data, error } = await supabase
    .from("agency_notices")
    .insert({
      agency_id: fields.agencyId,
      target_organization_id: fields.targetOrganizationId,
      notice_type: fields.noticeType,
      subject: fields.subject,
      body: fields.body,
      related_submission_id: fields.relatedSubmissionId,
      issued_by_user_id: fields.issuedByUserId,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to insert notice: ${error?.message ?? "no data"}`);
  }
  return rowToNotice(data as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Analytics snapshots — read-only consumer for dashboards
// ---------------------------------------------------------------------------

export async function getAnalyticsSnapshots(
  agencyId: string,
  snapshotType: AnalyticsSnapshotType,
  supabase: SupabaseClient,
): Promise<AnalyticsSnapshot[]> {
  const { data, error } = await supabase
    .from("analytics_snapshots")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("snapshot_type", snapshotType)
    .order("computed_at", { ascending: false })
    .limit(10);
  if (error) throw new AppError("INTERNAL", `Failed to read analytics: ${error.message}`);
  return (data ?? []).map((row) => rowToAnalyticsSnapshot(row as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Scope helpers
// ---------------------------------------------------------------------------

export async function getOversightOrgIds(
  agencyId: string,
  supabase: SupabaseClient,
): Promise<string[]> {
  const agency = await getAgencyById(agencyId, supabase);
  return agency?.oversightOrgIds ?? [];
}

export async function isOrgInAgencyScope(
  agencyId: string,
  organizationId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  const orgIds = await getOversightOrgIds(agencyId, supabase);
  return orgIds.includes(organizationId);
}
