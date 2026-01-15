// app/intake/[caseId]/documents/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { IntakeShell } from "@/components/intake/IntakeShell";
import { Field, TextInput } from "@/components/intake/fields";

import type { CaseData } from "@/lib/intake/types";
import { loadCaseDraft, saveCaseDraft } from "@/lib/intake/api";
import { nextStep, stepHref } from "@/lib/intake/steps";

type OtherDoc = { label?: string; uploaded?: boolean };

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        cursor: "pointer",
        marginBottom: 10,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export default function DocumentsPage() {
  // ✅ useParams can yield string | string[] | undefined depending on Next config
  const params = useParams();
  const raw = (params as any)?.caseId;
  const caseId: string | undefined = Array.isArray(raw) ? raw[0] : raw;

  const router = useRouter();

  const [draft, setDraft] = useState<CaseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const documents = useMemo(() => draft?.documents, [draft]);
  const checklist = documents?.checklist ?? {};
  const otherDocs = (checklist.otherDocs ?? []) as OtherDoc[];

  useEffect(() => {
    if (!caseId) {
      setLoading(false);
      setError("Missing case id in the URL.");
      return;
    }

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const d = await loadCaseDraft(caseId);
        if (!mounted) return;

        // Expecting loadCaseDraft to return CaseData (or null)
        setDraft((d ?? null) as CaseData | null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load documents section.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [caseId]);

  // ✅ Guard early so below code can treat caseId as string
  if (!caseId) {
    return (
      <IntakeShell
        caseId={"missing"}
        step="documents"
        title="Documents"
        description="Missing case id in the URL."
      >
        <p style={{ color: "crimson" }}>{error ?? "Missing case id."}</p>
      </IntakeShell>
    );
  }

  function patchDocuments(patch: Partial<NonNullable<CaseData["documents"]>>) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        documents: {
          ...(prev.documents ?? ({} as any)),
          ...patch,
        },
      };
    });
  }

  function patchChecklist(
    patch: Partial<NonNullable<NonNullable<CaseData["documents"]>["checklist"]>>
  ) {
    setDraft((prev) => {
      if (!prev) return prev;

      const docs = prev.documents ?? ({} as any);
      const cl = docs.checklist ?? {};

      return {
        ...prev,
        documents: {
          ...docs,
          checklist: {
            ...cl,
            ...patch,
          },
        },
      };
    });
  }

  function setOtherDoc(index: number, patch: Partial<OtherDoc>) {
    const arr = (checklist.otherDocs ?? []) as OtherDoc[];
    const next = arr.map((x, i) => (i === index ? { ...x, ...patch } : x));
    patchChecklist({ otherDocs: next });
  }

  function addOtherDoc() {
    const arr = (checklist.otherDocs ?? []) as OtherDoc[];
    patchChecklist({ otherDocs: [...arr, { uploaded: false }] });
  }

  function removeOtherDoc(index: number) {
    const arr = (checklist.otherDocs ?? []) as OtherDoc[];
    patchChecklist({ otherDocs: arr.filter((_, i) => i !== index) });
  }

async function handleSave(goNext?: boolean) {
  if (!draft) return;

  // ✅ FIX: ensure we have a real string before using it
  const cid = caseId;
  if (!cid) {
    setError("Missing case id in the URL.");
    return;
  }

  setSaving(true);
  setError(null);

  try {
    await saveCaseDraft(cid, draft);

    if (goNext) {
      const nxt = nextStep("documents");
      if (nxt) router.push(stepHref(cid, nxt));
    }
  } catch (e: any) {
    setError(e?.message ?? "Could not save.");
  } finally {
    setSaving(false);
  }
}

  if (loading) {
    return (
      <IntakeShell
        caseId={caseId}
        step="documents"
        title="Documents"
        description="Track what documents you have (uploads can be wired in next)."
      >
        <p>Loading…</p>
      </IntakeShell>
    );
  }

  if (!draft) {
    return (
      <IntakeShell
        caseId={caseId}
        step="documents"
        title="Documents"
        description="Track what documents you have (uploads can be wired in next)."
      >
        <p style={{ color: "crimson" }}>{error ?? "No case draft loaded."}</p>
      </IntakeShell>
    );
  }

  return (
    <IntakeShell
      caseId={caseId}
      step="documents"
      title="Documents"
      description="Check off what you already have. This helps prevent delays and denials."
      footer={
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          {error ? (
            <span style={{ color: "crimson", marginRight: "auto" }}>{error}</span>
          ) : null}

          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {saving ? "Saving…" : "Save & Continue"}
          </button>
        </div>
      }
    >
      <h2 style={{ margin: "8px 0 10px" }}>Core documents</h2>

      <Checkbox
        checked={!!checklist.policeReport}
        onChange={(v) => patchChecklist({ policeReport: v })}
        label="Police report / incident report"
      />
      <Checkbox
        checked={!!checklist.medicalBills}
        onChange={(v) => patchChecklist({ medicalBills: v })}
        label="Medical bills / statements"
      />
      <Checkbox
        checked={!!checklist.counselingBills}
        onChange={(v) => patchChecklist({ counselingBills: v })}
        label="Counseling / therapy bills"
      />
      <Checkbox
        checked={!!checklist.funeralInvoices}
        onChange={(v) => patchChecklist({ funeralInvoices: v })}
        label="Funeral / burial invoices"
      />
      <Checkbox
        checked={!!checklist.wageProof}
        onChange={(v) => patchChecklist({ wageProof: v })}
        label="Proof of lost wages (employer letter, pay stubs, etc.)"
      />
      <Checkbox
        checked={!!checklist.idProof}
        onChange={(v) => patchChecklist({ idProof: v })}
        label="ID proof (victim/applicant)"
      />

      <hr style={{ margin: "18px 0" }} />

      <h2 style={{ margin: "8px 0 10px" }}>Other documents</h2>

      {otherDocs.length === 0 ? (
        <p style={{ color: "#666" }}>No other documents added yet.</p>
      ) : null}

      {otherDocs.map((d, i) => (
        <div
          key={`other-${i}`}
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <strong>Other document #{i + 1}</strong>
            <button
              onClick={() => removeOtherDoc(i)}
              type="button"
              style={{
                border: "1px solid #ddd",
                background: "#fff",
                borderRadius: 10,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 180px",
              gap: 16,
              marginTop: 10,
            }}
          >
            <Field label="Label (optional)">
              <TextInput
                value={d.label ?? ""}
                onChange={(e) => setOtherDoc(i, { label: e.target.value })}
                placeholder="e.g. court order, receipts"
              />
            </Field>

            <Field label="Have it?">
              <select
                value={d.uploaded ? "yes" : "no"}
                onChange={(e) => setOtherDoc(i, { uploaded: e.target.value === "yes" })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  outline: "none",
                }}
              >
                <option value="no">Not yet</option>
                <option value="yes">Yes</option>
              </select>
            </Field>
          </div>
        </div>
      ))}

      <button
        onClick={addOtherDoc}
        type="button"
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        + Add other document
      </button>

      <hr style={{ margin: "18px 0" }} />

      <Field label="Notes (optional)" hint="Anything you’re missing or want an advocate to know.">
        <TextInput
          value={documents?.notes ?? ""}
          onChange={(e) => patchDocuments({ notes: e.target.value })}
          placeholder="Type here…"
        />
      </Field>
    </IntakeShell>
  );
}