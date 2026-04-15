/**
 * Domain 4.1 — Referral serializer variants for the three-state data
 * visibility spec (Master System Document).
 *
 * buildPendingAcceptancePreview
 *   Output for the receiving org BEFORE acceptance. Mask to: first name,
 *   general crime type, geographic region, service type, referring org
 *   name, referral note. Never includes last name, contact info, intake
 *   answers, case notes, or documents.
 *
 * buildReferralSharePackage
 *   Output AFTER acceptance. Governed first-class shape:
 *     applicantFullName, contactInfo, intakeSummary, documentManifest.
 *   Document manifests list file names + types only — contents are
 *   separately consent-gated (document service signs URLs).
 *
 * buildRevokedView
 *   Output when the referral is rejected/cancelled. Returns status only.
 *   Any applicant data that flowed through pending_acceptance or accepted
 *   is no longer reachable through this serializer.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { getReferralById } from "./referralRepository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CrimeTypeCategory =
  | "domestic_violence"
  | "sexual_assault"
  | "homicide"
  | "community_violence"
  | "human_trafficking"
  | "other";

export interface ReferralPendingAcceptancePreview {
  referralId: string;
  status: "pending_acceptance";
  firstName: string | null;
  crimeType: CrimeTypeCategory;
  region: { city: string | null; county: string | null };
  serviceType: string | null;
  referringOrgName: string | null;
  referralNote: string | null;
  createdAt: string;
  /** When the referral expires (auto-cancel) in ISO form. */
  expiresAt: string;
}

export interface ReferralSharePackage {
  referralId: string;
  status: "accepted";
  applicantFullName: string;
  contactInfo: {
    phone: string | null;
    email: string | null;
    preferredContact: string;
  };
  intakeSummary: {
    crimeType: CrimeTypeCategory;
    incidentDate: string | null;
    primaryNeeds: string[];
    languagePreference: string;
    accessibilityNeeds: string[];
  };
  documentManifest: Array<{
    documentId: string;
    fileName: string;
    documentType: string;
    uploadedAt: string;
  }>;
  acceptedAt: string | null;
}

export interface ReferralRevokedView {
  referralId: string;
  status: "rejected" | "cancelled" | "closed" | "draft";
}

// ---------------------------------------------------------------------------
// Pending acceptance preview
// ---------------------------------------------------------------------------

const AUTO_CANCEL_MS = 14 * 24 * 60 * 60 * 1000;

function categorizeCrimeType(raw: string | null | undefined): CrimeTypeCategory {
  const s = (raw ?? "").toLowerCase();
  if (!s) return "other";
  if (s.includes("domestic")) return "domestic_violence";
  if (s.includes("sexual") || s.includes("assault") && s.includes("sex")) return "sexual_assault";
  if (s.includes("homicide") || s.includes("murder")) return "homicide";
  if (s.includes("community") || s.includes("shooting") || s.includes("gun")) {
    return "community_violence";
  }
  if (s.includes("traffic") || s.includes("htt")) return "human_trafficking";
  return "other";
}

export async function buildPendingAcceptancePreview(
  referralId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ReferralPendingAcceptancePreview> {
  const referral = await getReferralById(referralId);
  if (!referral) throw new AppError("NOT_FOUND", "Referral not found.", undefined, 404);
  if (referral.status !== "pending_acceptance") {
    throw new AppError(
      "VALIDATION_ERROR",
      `Preview only available while referral is pending_acceptance (currently '${referral.status}').`,
      undefined,
      422,
    );
  }

  // Pull the referring org name. Name-only — no other org fields.
  const { data: sourceOrg } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", referral.source_organization_id)
    .maybeSingle();

  // Pull the applicant's FIRST name only from profile personal_info. Also
  // extract city/county. Strictly nothing else.
  const { data: profile } = await supabase
    .from("profiles")
    .select("personal_info")
    .eq("user_id", referral.applicant_id)
    .maybeSingle();
  const pi = (profile as { personal_info?: Record<string, unknown> } | null)?.personal_info ?? {};

  const firstName = firstTokenFrom(
    typeof pi.preferred_name === "string"
      ? pi.preferred_name
      : typeof pi.legal_first_name === "string"
        ? pi.legal_first_name
        : null,
  );
  const city = typeof pi.city === "string" ? pi.city : null;
  const county = typeof pi.county === "string" ? pi.county : null;

  // Crime type from the linked case (or support request). Category only —
  // never the incident detail text.
  let rawCrimeType: string | null = null;
  let serviceType: string | null = null;
  if (referral.case_id) {
    const { data: caseRow } = await supabase
      .from("cases")
      .select("crime_type, service_type")
      .eq("id", referral.case_id)
      .maybeSingle();
    const c = caseRow as Record<string, unknown> | null;
    rawCrimeType = typeof c?.crime_type === "string" ? c.crime_type : null;
    serviceType = typeof c?.service_type === "string" ? c.service_type : null;
  }
  if (!serviceType && referral.support_request_id) {
    const { data: srRow } = await supabase
      .from("support_requests")
      .select("service_type, crime_type")
      .eq("id", referral.support_request_id)
      .maybeSingle();
    const s = srRow as Record<string, unknown> | null;
    rawCrimeType = rawCrimeType ?? (typeof s?.crime_type === "string" ? s.crime_type : null);
    serviceType = typeof s?.service_type === "string" ? s.service_type : null;
  }

  const expiresAt = new Date(
    new Date(referral.created_at).getTime() + AUTO_CANCEL_MS,
  ).toISOString();

  return {
    referralId: referral.id,
    status: "pending_acceptance",
    firstName,
    crimeType: categorizeCrimeType(rawCrimeType),
    region: { city, county },
    serviceType,
    referringOrgName: (sourceOrg as { name?: string } | null)?.name ?? null,
    referralNote: referral.reason,
    createdAt: referral.created_at,
    expiresAt,
  };
}

function firstTokenFrom(name: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const first = trimmed.split(/\s+/)[0];
  return first || null;
}

// ---------------------------------------------------------------------------
// Accepted — ReferralSharePackage
// ---------------------------------------------------------------------------

export async function buildReferralSharePackage(
  referralId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ReferralSharePackage> {
  const referral = await getReferralById(referralId);
  if (!referral) throw new AppError("NOT_FOUND", "Referral not found.", undefined, 404);
  if (referral.status !== "accepted") {
    throw new AppError(
      "VALIDATION_ERROR",
      `Share package only available on accepted referrals (currently '${referral.status}').`,
      undefined,
      422,
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("personal_info")
    .eq("user_id", referral.applicant_id)
    .maybeSingle();
  const pi = (profile as { personal_info?: Record<string, unknown> } | null)?.personal_info ?? {};

  const legalFirst = typeof pi.legal_first_name === "string" ? pi.legal_first_name.trim() : "";
  const legalLast = typeof pi.legal_last_name === "string" ? pi.legal_last_name.trim() : "";
  const preferred = typeof pi.preferred_name === "string" ? pi.preferred_name.trim() : "";
  const fullName =
    preferred || [legalFirst, legalLast].filter(Boolean).join(" ").trim() || "Applicant";

  const contactInfo = {
    phone: typeof pi.phone === "string" ? pi.phone : null,
    email: typeof pi.email === "string" ? pi.email : null,
    preferredContact:
      typeof pi.preferred_contact === "string" ? pi.preferred_contact : "unspecified",
  };

  // Intake summary — structured only. Never raw answers.
  let intakeSummary: ReferralSharePackage["intakeSummary"] = {
    crimeType: "other",
    incidentDate: null,
    primaryNeeds: [],
    languagePreference:
      typeof pi.language_preference === "string" ? pi.language_preference : "en",
    accessibilityNeeds: [],
  };
  if (referral.case_id) {
    const { data: caseRow } = await supabase
      .from("cases")
      .select("crime_type, incident_date, primary_needs, accessibility_needs")
      .eq("id", referral.case_id)
      .maybeSingle();
    const c = caseRow as Record<string, unknown> | null;
    if (c) {
      intakeSummary = {
        crimeType: categorizeCrimeType(
          typeof c.crime_type === "string" ? c.crime_type : null,
        ),
        incidentDate: typeof c.incident_date === "string" ? c.incident_date : null,
        primaryNeeds: Array.isArray(c.primary_needs) ? (c.primary_needs as string[]) : [],
        languagePreference: intakeSummary.languagePreference,
        accessibilityNeeds: Array.isArray(c.accessibility_needs)
          ? (c.accessibility_needs as string[])
          : [],
      };
    }
  }

  // Document manifest — names + types only. No storage_path, no signed URL,
  // no content. Downstream download routes handle consent-gated signing.
  const linkedObjectId = referral.case_id ?? referral.support_request_id;
  let documentManifest: ReferralSharePackage["documentManifest"] = [];
  if (linkedObjectId) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, file_name, document_type, created_at, status")
      .eq("linked_object_id", linkedObjectId)
      .neq("status", "archived");
    documentManifest = (docs ?? []).map((d) => {
      const r = d as Record<string, unknown>;
      return {
        documentId: String(r.id),
        fileName: String(r.file_name ?? ""),
        documentType: String(r.document_type ?? "other"),
        uploadedAt: String(r.created_at ?? ""),
      };
    });
  }

  return {
    referralId: referral.id,
    status: "accepted",
    applicantFullName: fullName,
    contactInfo,
    intakeSummary,
    documentManifest,
    acceptedAt: referral.responded_at,
  };
}

// ---------------------------------------------------------------------------
// Revoked view
// ---------------------------------------------------------------------------

export function buildRevokedView(
  referralId: string,
  status: "rejected" | "cancelled" | "closed" | "draft",
): ReferralRevokedView {
  return { referralId, status };
}

/**
 * Single entry point for the receiving (target) org. Branches on status so a
 * rejected/cancelled referral never leaks pre-acceptance preview data, and an
 * accepted referral never falls back to the minimal view.
 */
export async function buildTargetOrgView(
  referralId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<
  | ReferralPendingAcceptancePreview
  | ReferralSharePackage
  | ReferralRevokedView
> {
  const referral = await getReferralById(referralId);
  if (!referral) throw new AppError("NOT_FOUND", "Referral not found.", undefined, 404);

  if (referral.status === "pending_acceptance") {
    return buildPendingAcceptancePreview(referralId, supabase);
  }
  if (referral.status === "accepted") {
    return buildReferralSharePackage(referralId, supabase);
  }
  return buildRevokedView(referral.id, referral.status);
}
