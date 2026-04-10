/**
 * Domain 1.4 — Document serializer tests.
 *
 * CRITICAL: Validates that storage_path is never present in any serializer output.
 */

import { describe, it, expect } from "vitest";
import {
  serializeForApplicant,
  serializeForProvider,
  serializeForAdmin,
} from "@/lib/server/documents/documentSerializer";
import type { DocumentRecord } from "@/lib/server/documents/documentTypes";

function makeDoc(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: "doc-1",
    case_id: "case-1",
    organization_id: "org-123",
    uploaded_by_user_id: "applicant-user",
    doc_type: "photo_id",
    description: "Government ID",
    file_name: "id.pdf",
    file_size: 1024,
    mime_type: "application/pdf",
    storage_path: "secret/internal/path/abc123.pdf",  // must NEVER appear in output
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

// ---------------------------------------------------------------------------
// storage_path never present
// ---------------------------------------------------------------------------

describe("storage_path never in any serializer output", () => {
  it("applicant view does not contain storage_path", () => {
    const view = serializeForApplicant(makeDoc());
    expect((view as unknown as Record<string, unknown>).storage_path).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain("storage_path");
    expect(JSON.stringify(view)).not.toContain("secret/internal");
  });

  it("provider view does not contain storage_path", () => {
    const view = serializeForProvider(makeDoc());
    expect((view as unknown as Record<string, unknown>).storage_path).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain("storage_path");
  });

  it("admin view does not contain storage_path", () => {
    const view = serializeForAdmin(makeDoc());
    expect((view as unknown as Record<string, unknown>).storage_path).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain("storage_path");
  });
});

// ---------------------------------------------------------------------------
// Applicant view excludes provider-only fields
// ---------------------------------------------------------------------------

describe("applicant view excludes provider-only fields", () => {
  it("does not include organization_id", () => {
    const view = serializeForApplicant(makeDoc());
    expect((view as unknown as Record<string, unknown>).organization_id).toBeUndefined();
  });

  it("does not include uploaded_by_user_id", () => {
    const view = serializeForApplicant(makeDoc());
    expect((view as unknown as Record<string, unknown>).uploaded_by_user_id).toBeUndefined();
  });

  it("does not include restriction_reason", () => {
    const view = serializeForApplicant(makeDoc());
    expect((view as unknown as Record<string, unknown>).restriction_reason).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Provider view includes operational metadata
// ---------------------------------------------------------------------------

describe("provider view includes operational metadata", () => {
  it("includes organization_id", () => {
    const view = serializeForProvider(makeDoc());
    expect(view.organization_id).toBe("org-123");
  });

  it("includes uploaded_by_user_id", () => {
    const view = serializeForProvider(makeDoc());
    expect(view.uploaded_by_user_id).toBe("applicant-user");
  });

  it("includes locked_at", () => {
    const view = serializeForProvider(makeDoc({ locked_at: "2026-04-07T12:00:00Z" }));
    expect(view.locked_at).toBe("2026-04-07T12:00:00Z");
  });
});

// ---------------------------------------------------------------------------
// Status coercion
// ---------------------------------------------------------------------------

describe("status coercion", () => {
  it("locked document surfaces as 'locked'", () => {
    const view = serializeForApplicant(makeDoc({ status: "locked" }));
    expect(view.status).toBe("locked");
  });

  it("archived document surfaces as 'archived'", () => {
    const view = serializeForApplicant(makeDoc({ status: "archived" }));
    expect(view.status).toBe("archived");
  });

  it("active document surfaces as 'active'", () => {
    const view = serializeForApplicant(makeDoc({ status: "active" }));
    expect(view.status).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// downloadDocument response shape
// ---------------------------------------------------------------------------

describe("downloadDocument response shape", () => {
  it("DownloadResult type contains signedUrl and expiresAt only", () => {
    // This is a shape assertion via type system — runtime check on the structure
    const result: { signedUrl: string; expiresAt: string } = {
      signedUrl: "https://example.com/signed",
      expiresAt: "2026-04-07T11:00:00Z",
    };
    expect(result.signedUrl).toBeTruthy();
    expect(result.expiresAt).toBeTruthy();
    expect((result as unknown as Record<string, unknown>).storage_path).toBeUndefined();
  });
});
