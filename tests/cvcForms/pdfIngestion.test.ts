/**
 * Domain 2.3 — CVC PDF ingestion tests.
 *
 * Covers pure helpers (normalize / guess / detect) and the upsert path with
 * a stubbed pdf-lib module so tests don't need a real PDF on disk.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// pdf-lib stub. The factory is hoisted, so we can't reference outer-scope
// vars — instead the test fields are stored on `globalThis.__PDF_TEST_FIELDS`
// and the factory reads them at PDFDocument.load() time.
// ---------------------------------------------------------------------------
type TestFieldSpec = {
  name: string;
  type: "text" | "checkbox" | "signature";
  multiline?: boolean;
  required?: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __PDF_TEST_FIELDS__: TestFieldSpec[];
}
globalThis.__PDF_TEST_FIELDS__ = [];

vi.mock("pdf-lib", () => {
  class PDFCheckBox {
    constructor(private name: string, private opts: { required?: boolean } = {}) {}
    getName() {
      return this.name;
    }
    getFullyQualifiedName() {
      return this.name;
    }
    isRequired() {
      return Boolean(this.opts.required);
    }
    acroField = {
      getWidgets: () => [
        { getRectangle: () => ({ x: 0, y: 0, width: 10, height: 10 }), P: () => null },
      ],
    };
  }
  class PDFTextField {
    constructor(
      private name: string,
      private opts: { multiline?: boolean; required?: boolean } = {},
    ) {}
    getName() {
      return this.name;
    }
    getFullyQualifiedName() {
      return this.name;
    }
    isRequired() {
      return Boolean(this.opts.required);
    }
    isMultiline() {
      return Boolean(this.opts.multiline);
    }
    acroField = {
      getWidgets: () => [
        { getRectangle: () => ({ x: 0, y: 0, width: 10, height: 10 }), P: () => null },
      ],
    };
  }
  class PDFSignature {
    constructor(private name: string) {}
    getName() {
      return this.name;
    }
    getFullyQualifiedName() {
      return this.name;
    }
    isRequired() {
      return false;
    }
    acroField = {
      getWidgets: () => [
        { getRectangle: () => ({ x: 0, y: 0, width: 10, height: 10 }), P: () => null },
      ],
    };
  }
  class PDFDropdown {}
  class PDFOptionList {}
  return {
    PDFCheckBox,
    PDFTextField,
    PDFSignature,
    PDFDropdown,
    PDFOptionList,
    PDFDocument: {
      load: async () => ({
        getPages: () => [],
        getForm: () => ({
          doc: { getPages: () => [] },
          getFields: () =>
            (globalThis.__PDF_TEST_FIELDS__ ?? []).map((spec) => {
              if (spec.type === "checkbox")
                return new PDFCheckBox(spec.name, { required: spec.required });
              if (spec.type === "signature") return new PDFSignature(spec.name);
              return new PDFTextField(spec.name, {
                multiline: spec.multiline,
                required: spec.required,
              });
            }),
        }),
      }),
    },
  };
});

const TEST_FIELDS = globalThis.__PDF_TEST_FIELDS__;

import {
  normalizePdfFieldName,
  guessSectionKey,
  labelFromFieldKey,
  ingestCvcPdf,
} from "@/lib/server/cvcForms/pdfIngestionService";

beforeEach(() => {
  TEST_FIELDS.length = 0;
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe("normalizePdfFieldName", () => {
  it("Claimant.FirstName → claimant_first_name", () => {
    expect(normalizePdfFieldName("Claimant.FirstName")).toBe("claimant_first_name");
  });
  it("Medical Expenses - Total → medical_expenses_total", () => {
    expect(normalizePdfFieldName("Medical Expenses - Total")).toBe("medical_expenses_total");
  });
  it("collapses runs of separators and trims edges", () => {
    expect(normalizePdfFieldName("__victim__DOB__")).toBe("victim_dob");
  });
  it("caps length at 100", () => {
    const out = normalizePdfFieldName("a".repeat(250));
    expect(out.length).toBe(100);
  });
  it("empty input returns empty string", () => {
    expect(normalizePdfFieldName("")).toBe("");
  });
});

describe("guessSectionKey", () => {
  it("MedicalExpenses_Total → medical", () => {
    expect(guessSectionKey("MedicalExpenses_Total")).toBe("medical");
  });
  it("ClaimantFirstName → applicant", () => {
    expect(guessSectionKey("ClaimantFirstName")).toBe("applicant");
  });
  it("victim_dob → victim", () => {
    expect(guessSectionKey("victim_dob")).toBe("victim");
  });
  it("crime_date → crime", () => {
    expect(guessSectionKey("crime_date")).toBe("crime");
  });
  it("funeral_home → funeral", () => {
    expect(guessSectionKey("funeral_home")).toBe("funeral");
  });
  it("returns null when no keyword matches", () => {
    expect(guessSectionKey("misc_random_xyz")).toBeNull();
  });
});

describe("labelFromFieldKey", () => {
  it("converts snake_case to Title Case", () => {
    expect(labelFromFieldKey("first_name")).toBe("First Name");
  });
});

// ---------------------------------------------------------------------------
// ingestCvcPdf — upsert behaviour against a stubbed Supabase client.
// ---------------------------------------------------------------------------

function makeSupabase(existing: Array<{ id: string; field_key: string; is_visible_to_applicant: boolean }> = []) {
  const inserts: unknown[] = [];
  const updates: unknown[] = [];
  const fieldsTable = {
    select: () => ({
      eq: () =>
        Promise.resolve({ data: existing, error: null }),
    }),
    insert: (row: unknown) => {
      inserts.push(row);
      return Promise.resolve({ data: null, error: null });
    },
    update: (patch: unknown) => ({
      eq: () => {
        updates.push(patch);
        return Promise.resolve({ data: null, error: null });
      },
    }),
  };
  return {
    client: { from: () => fieldsTable } as never,
    inserts,
    updates,
  };
}

describe("ingestCvcPdf", () => {
  it("creates new rows for unseen field_keys", async () => {
    TEST_FIELDS.push(
      { name: "Claimant.FirstName", type: "text" },
      { name: "VictimDOB", type: "text" },
      { name: "MedicalExpensesTotal", type: "text" },
    );
    const { client, inserts } = makeSupabase();
    const result = await ingestCvcPdf(Buffer.from("x"), "tmpl-1", client);
    expect(result.fieldsCreated).toBe(3);
    expect(result.fieldsUpdated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(inserts).toHaveLength(3);
  });

  it("skips field_keys whose existing row is is_visible_to_applicant=false", async () => {
    TEST_FIELDS.push({ name: "InternalAdminNote", type: "text" });
    const { client, inserts, updates } = makeSupabase([
      { id: "f-1", field_key: "internal_admin_note", is_visible_to_applicant: false },
    ]);
    const result = await ingestCvcPdf(Buffer.from("x"), "tmpl-1", client);
    expect(result.skipped).toBe(1);
    expect(result.fieldsCreated).toBe(0);
    expect(result.fieldsUpdated).toBe(0);
    expect(inserts).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it("updates existing applicant-visible rows", async () => {
    TEST_FIELDS.push({ name: "Claimant.FirstName", type: "text" });
    const { client, updates } = makeSupabase([
      { id: "f-1", field_key: "claimant_first_name", is_visible_to_applicant: true },
    ]);
    const result = await ingestCvcPdf(Buffer.from("x"), "tmpl-1", client);
    expect(result.fieldsUpdated).toBe(1);
    expect(updates).toHaveLength(1);
  });

  it("classifies field_type from name + class", async () => {
    TEST_FIELDS.push(
      { name: "MedicalExpensesAmount", type: "text" },
      { name: "VictimDateOfBirth", type: "text" },
      { name: "ConsentSigned", type: "checkbox" },
      { name: "ApplicantSignature", type: "signature" },
      { name: "IncidentDescription", type: "text", multiline: true },
    );
    const { client } = makeSupabase();
    const result = await ingestCvcPdf(Buffer.from("x"), "tmpl-1", client);
    const byKey = Object.fromEntries(result.fields.map((f) => [f.fieldKey, f.fieldType]));
    expect(byKey.medical_expenses_amount).toBe("currency");
    expect(byKey.victim_date_of_birth).toBe("date");
    expect(byKey.consent_signed).toBe("checkbox");
    expect(byKey.applicant_signature).toBe("signature");
    expect(byKey.incident_description).toBe("textarea");
  });

  it("rejects empty buffer", async () => {
    const { client } = makeSupabase();
    await expect(ingestCvcPdf(Buffer.alloc(0), "tmpl-1", client)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects missing templateId", async () => {
    const { client } = makeSupabase();
    await expect(ingestCvcPdf(Buffer.from("x"), "", client)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
