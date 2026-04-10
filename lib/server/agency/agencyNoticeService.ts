/**
 * Domain 6.2 — Agency notice service.
 *
 * Formal notices from agency → provider. Tied to reporting submissions
 * or standalone compliance/information requests.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { AgencyNotice, AgencyNoticeType } from "./agencyTypes";
import { insertNotice } from "./agencyRepository";

export interface CreateNoticeInput {
  agencyId: string;
  targetOrganizationId: string;
  noticeType: AgencyNoticeType;
  subject: string;
  body: string;
  relatedSubmissionId?: string;
  issuedByUserId: string;
}

export async function createAgencyNotice(
  input: CreateNoticeInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<AgencyNotice> {
  if (!input.subject || input.subject.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "Notice subject is required.", undefined, 422);
  }
  if (!input.body || input.body.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "Notice body is required.", undefined, 422);
  }

  const notice = await insertNotice(
    {
      agencyId: input.agencyId,
      targetOrganizationId: input.targetOrganizationId,
      noticeType: input.noticeType,
      subject: input.subject,
      body: input.body,
      relatedSubmissionId: input.relatedSubmissionId ?? null,
      issuedByUserId: input.issuedByUserId,
    },
    supabase,
  );

  await logEvent({
    ctx: null,
    action: "agency.notice_issued" as Parameters<typeof logEvent>[0]["action"],
    resourceType: "agency_notice",
    resourceId: notice.id,
    organizationId: input.targetOrganizationId,
    metadata: {
      notice_type: input.noticeType,
      agency_id: input.agencyId,
      related_submission_id: input.relatedSubmissionId ?? null,
    },
  }).catch(() => {});

  return notice;
}
