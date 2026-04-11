/**
 * Gap closure — SupportRequest serializer safety tests (3 tests)
 */

import { describe, it, expect } from "vitest";
import {
  serializeForApplicant,
  serializeForProvider,
} from "@/lib/server/supportRequests/supportRequestSerializer";
import type { SupportRequestRecord } from "@/lib/server/supportRequests/supportRequestTypes";

const mockSR: SupportRequestRecord = {
  id: "sr-1",
  applicant_id: "user-1",
  organization_id: "org-1",
  program_id: "prog-1",
  status: "accepted",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-10T00:00:00Z",
  submitted_at: "2026-04-02T00:00:00Z",
  reviewed_at: "2026-04-05T00:00:00Z",
  accepted_at: "2026-04-05T00:00:00Z",
  declined_at: null,
  withdrawn_at: null,
  closed_at: null,
  decline_reason: null,
  transfer_reason: "Internal transfer notes — SHOULD NOT LEAK",
  case_id: "case-1",
  state_workflow_config_id: "swc-1",
};

describe("support request serializer safety", () => {
  it("applicant serializer does NOT include internal triage notes or provider assignment detail", () => {
    const view = serializeForApplicant(mockSR);
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/reviewed_at/);
    expect(json).not.toMatch(/transfer_reason/);
    expect(json).not.toMatch(/state_workflow_config_id/);
    expect(json).not.toMatch(/case_id/);
    expect(json).not.toMatch(/applicant_id/);
    expect(json).not.toMatch(/SHOULD NOT LEAK/);
    expect(view.status).toBe("accepted");
  });

  it("provider serializer includes org-scoped operational detail", () => {
    const view = serializeForProvider(mockSR);
    expect(view.applicant_id).toBe("user-1");
    expect(view.reviewed_at).toBe("2026-04-05T00:00:00Z");
    expect(view.transfer_reason).toBe("Internal transfer notes — SHOULD NOT LEAK");
    expect(view.case_id).toBe("case-1");
  });

  it("cross-role check: transfer_reason present in provider but absent in applicant", () => {
    const applicantView = serializeForApplicant(mockSR);
    const providerView = serializeForProvider(mockSR);
    const applicantJson = JSON.stringify(applicantView);
    const providerJson = JSON.stringify(providerView);
    expect(providerJson).toMatch(/transfer_reason/);
    expect(applicantJson).not.toMatch(/transfer_reason/);
  });
});
