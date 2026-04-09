/**
 * Domain 2.4: Translation / i18n — serializer tests.
 *
 * HARD RULES verified:
 *   - serializeExplanationResult does NOT expose source_text_hash, length, model
 *   - serializeAdminExplanationLog does NOT expose explanation_text body
 *   - serializeLocalePreference returns { locale } only
 */

import { describe, it, expect } from "vitest";

import {
  serializeLocalePreference,
  serializeExplanationResult,
  serializeAdminExplanationLog,
  serializeAdminMappingSet,
} from "@/lib/server/translation/translationSerializer";
import type {
  LocalePreferenceRecord,
  ExplanationRequestRecord,
  TranslationMappingSetRecordV2,
  TranslationMappingRecord,
} from "@/lib/server/translation/translationTypes";

function makeLocaleRow(): LocalePreferenceRecord {
  return {
    id: "lp-1",
    user_id: "user-1",
    locale: "es",
    updated_at: "2026-04-01T00:00:00Z",
  };
}

function makeRequestRow(
  overrides: Partial<ExplanationRequestRecord> = {},
): ExplanationRequestRecord {
  return {
    id: "req-1",
    user_id: "applicant-1",
    workflow_key: "translator",
    context_type: "intake_question",
    field_key: "victim.firstName",
    state_code: "IL",
    source_text_hash: "abc123def456",
    source_text_length: 42,
    explanation_text: "This question asks about your first name.",
    disclaimer: "This is general information, not legal advice.",
    model: "gpt-4o-mini",
    status: "completed",
    failure_reason: null,
    created_at: "2026-04-08T00:00:00Z",
    completed_at: "2026-04-08T00:00:01Z",
    ...overrides,
  };
}

function makeSet(): TranslationMappingSetRecordV2 {
  return {
    id: "set-1",
    state_workflow_config_id: null,
    state_code: "IL",
    locale: "es",
    status: "active",
    version_number: 1,
    display_name: "IL Spanish v1",
    published_at: "2026-04-08T00:00:00Z",
    deprecated_at: null,
    created_by: "admin-1",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  };
}

describe("serializeLocalePreference", () => {
  it("returns { locale } only — no audit metadata", () => {
    const view = serializeLocalePreference(makeLocaleRow());
    expect(view).toEqual({ locale: "es" });
    expect(view).not.toHaveProperty("user_id");
    expect(view).not.toHaveProperty("updated_at");
    expect(view).not.toHaveProperty("id");
  });
});

describe("serializeExplanationResult", () => {
  it("includes explanation + disclaimer + status", () => {
    const view = serializeExplanationResult(makeRequestRow());
    expect(view.explanation).toBe("This question asks about your first name.");
    expect(view.disclaimer).toBe("This is general information, not legal advice.");
    expect(view.status).toBe("completed");
  });

  it("does NOT expose source_text_hash, source_text_length, model, or user_id", () => {
    const view = serializeExplanationResult(makeRequestRow());
    expect(view).not.toHaveProperty("source_text_hash");
    expect(view).not.toHaveProperty("source_text_length");
    expect(view).not.toHaveProperty("model");
    expect(view).not.toHaveProperty("user_id");
  });

  it("never has a source_text field", () => {
    const view = serializeExplanationResult(makeRequestRow()) as Record<string, unknown>;
    expect(view).not.toHaveProperty("source_text");
    expect(view).not.toHaveProperty("sourceText");
  });
});

describe("serializeAdminExplanationLog", () => {
  it("exposes hash + length + audit metadata", () => {
    const view = serializeAdminExplanationLog(makeRequestRow());
    expect(view.source_text_hash).toBe("abc123def456");
    expect(view.source_text_length).toBe(42);
    expect(view.workflow_key).toBe("translator");
    expect(view.context_type).toBe("intake_question");
    expect(view.status).toBe("completed");
  });

  it("does NOT expose explanation_text body (admin compliance view, not content view)", () => {
    const view = serializeAdminExplanationLog(makeRequestRow());
    expect(view).not.toHaveProperty("explanation_text");
    expect(view).not.toHaveProperty("disclaimer");
    expect(JSON.stringify(view)).not.toContain("This question asks");
  });

  it("never exposes a source_text field", () => {
    const view = serializeAdminExplanationLog(makeRequestRow()) as Record<string, unknown>;
    expect(view).not.toHaveProperty("source_text");
  });
});

describe("serializeAdminMappingSet", () => {
  it("includes mapping_count and full audit metadata", () => {
    const mappings: TranslationMappingRecord[] = [
      {
        id: "m-1",
        mapping_set_id: "set-1",
        source_value: "víctima",
        canonical_value: "victim",
        field_context: "applicant_type",
        locale: "es",
        transform_type: null,
        created_at: "2026-04-01T00:00:00Z",
      },
      {
        id: "m-2",
        mapping_set_id: "set-1",
        source_value: "familiar",
        canonical_value: "family_member",
        field_context: "applicant_type",
        locale: "es",
        transform_type: null,
        created_at: "2026-04-01T00:00:00Z",
      },
    ];
    const view = serializeAdminMappingSet(makeSet(), mappings);
    expect(view.id).toBe("set-1");
    expect(view.status).toBe("active");
    expect(view.version_number).toBe(1);
    expect(view.mapping_count).toBe(2);
  });
});
