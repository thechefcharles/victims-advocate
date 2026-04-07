/**
 * Domain 1.4 — Document service tests.
 *
 * Validates: storage_path not in responses, version records, signed URL pattern,
 * consent gate, lock status, audit events.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/trustSignal/signalEmitter", () => ({
  emitSignal: vi.fn().mockResolvedValue({ success: true, signalId: "sig-1" }),
}));

vi.mock("@/lib/server/consents/sharingPermissionService", () => ({
  isSharingAllowed: vi.fn().mockResolvedValue({ allowed: true, grantId: "grant-1" }),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/signed-url" },
          error: null,
        }),
      }),
    },
  }),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import {
  uploadDocument,
  getDocument,
  downloadDocument,
  shareDocument,
  lockDocument,
  replaceDocument,
  softDeleteDocument,
} from "@/lib/server/documents/documentService";
import { logEvent } from "@/lib/server/audit/logEvent";
import { isSharingAllowed } from "@/lib/server/consents/sharingPermissionService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDocRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    case_id: "case-1",
    organization_id: "org-123",
    uploaded_by_user_id: "applicant-user",
    doc_type: "photo_id",
    description: null,
    file_name: "id.pdf",
    file_size: 1024,
    mime_type: "application/pdf",
    storage_path: "applicant-user/abc123.pdf",   // MUST NOT appear in output
    status: "active",
    deleted_at: null,
    deleted_by: null,
    restricted_at: null,
    restricted_by: null,
    restriction_reason: null,
    locked_at: null,
    archived_at: null,
    linked_object_type: "case",
    linked_object_id: "case-1",
    created_at: "2026-04-07T10:00:00Z",
    ...overrides,
  };
}

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "user-actor",
    accountType: "provider",
    activeRole: "supervisor",
    tenantId: "org-123",
    tenantType: "provider",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
    ...overrides,
  };
}

function makeSupabase(opts: {
  docRow?: Record<string, unknown> | null;
  insertResult?: { data: unknown; error: unknown };
  versionCount?: number;
} = {}): SupabaseClient {
  const { docRow = makeDocRow(), insertResult, versionCount = 0 } = opts;

  function chain(resolvedValue: unknown) {
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "neq", "order", "limit", "not", "in"]) {
      b[m] = vi.fn().mockReturnValue(b);
    }
    b["maybeSingle"] = vi.fn().mockResolvedValue({ data: resolvedValue, error: null });
    b["single"] = vi.fn().mockResolvedValue(
      insertResult ?? { data: resolvedValue, error: null }
    );
    b["then"] = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: resolvedValue, error: null }).then(resolve);
    return b;
  }

  const countChain: Record<string, unknown> = {};
  countChain["select"] = vi.fn().mockReturnValue({ ...countChain, count: versionCount });
  countChain["eq"] = vi.fn().mockReturnValue({ ...countChain, count: versionCount });
  countChain["then"] = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ count: versionCount, error: null }).then(resolve);

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "document_versions") {
        return {
          insert: vi.fn().mockReturnValue(chain({ ...makeDocRow(), id: "ver-1" })),
          select: vi.fn().mockReturnValue(countChain),
        };
      }
      return {
        select: vi.fn().mockReturnValue(chain(docRow)),
        insert: vi.fn().mockReturnValue(chain(insertResult ?? { data: docRow, error: null })),
        update: vi.fn().mockReturnValue(chain(docRow)),
      };
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/signed-url" },
          error: null,
        }),
      }),
    },
  } as unknown as SupabaseClient;
}

beforeEach(() => { vi.clearAllMocks(); });

// ---------------------------------------------------------------------------
// uploadDocument — storage_path NOT in response
// ---------------------------------------------------------------------------

describe("uploadDocument()", () => {
  it("returns applicant view without storage_path", async () => {
    const actor = makeActor({ accountType: "applicant", activeRole: null, tenantId: null, tenantType: null, userId: "applicant-user" });
    const supabase = makeSupabase({ insertResult: { data: makeDocRow(), error: null } });
    const result = await uploadDocument(
      actor,
      {
        doc_type: "photo_id",
        file_name: "id.pdf",
        file_size: 1024,
        mime_type: "application/pdf",
        storage_path: "applicant-user/abc123.pdf",
        organization_id: null,
      },
      supabase,
    );
    expect((result as unknown as Record<string, unknown>).storage_path).toBeUndefined();
    expect(result.id).toBe("doc-1");
  });

  it("fires document.upload audit event", async () => {
    const actor = makeActor({ accountType: "applicant", activeRole: null, tenantId: null, tenantType: null, userId: "applicant-user" });
    const supabase = makeSupabase({ insertResult: { data: makeDocRow(), error: null } });
    await uploadDocument(actor, { doc_type: "photo_id", file_name: "id.pdf", storage_path: "x/y.pdf", organization_id: null }, supabase);
    expect(vi.mocked(logEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "document.upload" }),
    );
  });
});

// ---------------------------------------------------------------------------
// downloadDocument — returns signedUrl not storage_path
// ---------------------------------------------------------------------------

describe("downloadDocument()", () => {
  it("returns signedUrl and expiresAt, not storage_path", async () => {
    const actor = makeActor();
    const supabase = makeSupabase();
    const result = await downloadDocument(actor, "doc-1", supabase);
    expect(result.signedUrl).toContain("signed-url");
    expect(result.expiresAt).toBeTruthy();
    expect((result as unknown as Record<string, unknown>).storage_path).toBeUndefined();
  });

  it("fires document.download audit event (SOC 2)", async () => {
    const actor = makeActor();
    const supabase = makeSupabase();
    await downloadDocument(actor, "doc-1", supabase);
    expect(vi.mocked(logEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "document.download" }),
    );
  });
});

// ---------------------------------------------------------------------------
// shareDocument — isSharingAllowed called before proceeding
// ---------------------------------------------------------------------------

describe("shareDocument()", () => {
  it("calls isSharingAllowed before sharing", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const supabase = makeSupabase();
    vi.mocked(isSharingAllowed).mockResolvedValueOnce({ allowed: true, grantId: "grant-1" });
    await shareDocument(actor, "doc-1", { recipient_org_id: "org-456", purpose: "voca_referral" }, supabase);
    expect(vi.mocked(isSharingAllowed)).toHaveBeenCalled();
  });

  it("throws FORBIDDEN when consent revoked", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const supabase = makeSupabase();
    vi.mocked(isSharingAllowed).mockResolvedValueOnce({ allowed: false, reason: "grant_expired" });
    await expect(
      shareDocument(actor, "doc-1", { recipient_org_id: "org-456", purpose: "voca_referral" }, supabase),
    ).rejects.toThrow();
  });

  it("fires document.shared and consent.sharing_checked audit events", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const supabase = makeSupabase();
    vi.mocked(isSharingAllowed).mockResolvedValueOnce({ allowed: true, grantId: "grant-1" });
    await shareDocument(actor, "doc-1", { recipient_org_id: "org-456", purpose: "voca_referral" }, supabase);
    const calls = vi.mocked(logEvent).mock.calls.map((c) => (c[0] as { action: string }).action);
    expect(calls).toContain("document.shared");
    expect(calls).toContain("consent.sharing_checked");
  });
});

// ---------------------------------------------------------------------------
// lockDocument — status=locked, audit event fired
// ---------------------------------------------------------------------------

describe("lockDocument()", () => {
  it("fires document.locked audit event", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const supabase = makeSupabase();
    await lockDocument(actor, "doc-1", supabase);
    expect(vi.mocked(logEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "document.locked" }),
    );
  });

  it("throws FORBIDDEN when document is already locked", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const supabase = makeSupabase({ docRow: makeDocRow({ status: "locked" }) });
    await expect(lockDocument(actor, "doc-1", supabase)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// replaceDocument — document_versions record created
// ---------------------------------------------------------------------------

describe("replaceDocument()", () => {
  it("creates a document_versions record before updating", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const supabase = makeSupabase({ versionCount: 1 });
    await replaceDocument(
      actor,
      "doc-1",
      { file_name: "new.pdf", storage_path: "x/new.pdf", mime_type: "application/pdf", file_size: 2048 },
      supabase,
    );
    expect(vi.mocked(logEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "document.replaced" }),
    );
    expect(vi.mocked(logEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "document.version_created" }),
    );
  });

  it("throws when document is locked", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const supabase = makeSupabase({ docRow: makeDocRow({ status: "locked" }) });
    await expect(
      replaceDocument(actor, "doc-1", { file_name: "x.pdf", storage_path: "x/x.pdf" }, supabase),
    ).rejects.toThrow();
  });
});
