// app/intake/[caseId]/employment/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { IntakeShell } from "@/components/intake/IntakeShell";
import { Field, TextInput } from "@/components/intake/fields";

import type { CaseData } from "@/lib/intake/types";
import { loadCaseDraft, saveCaseDraft } from "@/lib/intake/api";
import { nextStep, stepHref } from "@/lib/intake/steps";

type YesNoUnknown = "yes" | "no" | "unknown";

function YesNoUnknownSelect({
  value,
  onChange,
}: {
  value: YesNoUnknown | undefined;
  onChange: (v: YesNoUnknown) => void;
}) {
  return (
    <select
      value={value ?? "unknown"}
      onChange={(e) => onChange(e.target.value as YesNoUnknown)}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #ddd",
        outline: "none",
      }}
    >
      <option value="unknown">Unknown</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );
}

export default function EmploymentPage() {
  // ✅ FIX: useParams() can return string | string[] | undefined
  const params = useParams();
  const raw = (params as any)?.caseId;
  const caseId: string | undefined = Array.isArray(raw) ? raw[0] : raw;

  const router = useRouter();

  const [draft, setDraft] = useState<CaseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const employment = useMemo(() => draft?.employment ?? {}, [draft]);

  useEffect(() => {
    // ✅ Guard: don’t fetch if caseId is missing
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

        setDraft(d ?? null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load employment section.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [caseId]);

  function patchEmployment(patch: Partial<NonNullable<CaseData["employment"]>>) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        employment: {
          ...(prev.employment ?? ({} as any)),
          ...patch,
        },
      };
    });
  }

  async function handleSave(goNext?: boolean) {
    if (!draft) return;

    // ✅ Guard: caseId is required for API + navigation
    if (!caseId) {
      setError("Missing case id in the URL.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveCaseDraft(caseId, draft);

      if (goNext) {
        const nxt = nextStep("employment");
        if (nxt) router.push(stepHref(caseId, nxt));
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
        title="Work & income"
        description="Employer details and missed work (if applicable)."
      >
        <p>Loading…</p>
      </IntakeShell>
    );
  }

  if (!draft) {
    return (
      <IntakeShell
        title="Work & income"
        description="Employer details and missed work (if applicable)."
      >
        <p style={{ color: "crimson" }}>{error ?? "No case draft loaded."}</p>
      </IntakeShell>
    );
  }

  return (
    <IntakeShell
      title="Work & income"
      description="If the victim missed work or lost income because of the crime, add what you know here."
    >
      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Was the victim employed at the time?" hint="If unsure, choose Unknown.">
          <YesNoUnknownSelect
            value={employment.employedAtTime}
            onChange={(v) => patchEmployment({ employedAtTime: v })}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Employer name (optional)">
            <TextInput
              value={employment.employerName ?? ""}
              onChange={(e) => patchEmployment({ employerName: e.target.value })}
              placeholder="Company / employer name"
            />
          </Field>

          <Field label="Employer phone (optional)">
            <TextInput
              value={employment.employerPhone ?? ""}
              onChange={(e) => patchEmployment({ employerPhone: e.target.value })}
              placeholder="(xxx) xxx-xxxx"
            />
          </Field>

          <Field label="Employer address (optional)">
            <TextInput
              value={employment.employerAddress ?? ""}
              onChange={(e) => patchEmployment({ employerAddress: e.target.value })}
              placeholder="Street, city, state"
            />
          </Field>
        </div>

        <hr style={{ margin: "18px 0" }} />

        <Field label="Did the victim miss work because of the crime?" hint="If unsure, choose Unknown.">
          <YesNoUnknownSelect
            value={employment.missedWork}
            onChange={(v) => patchEmployment({ missedWork: v })}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Missed work from (optional)">
            <TextInput
              type="date"
              value={employment.missedWorkFrom ?? ""}
              onChange={(e) => patchEmployment({ missedWorkFrom: e.target.value })}
            />
          </Field>

          <Field label="Missed work to (optional)">
            <TextInput
              type="date"
              value={employment.missedWorkTo ?? ""}
              onChange={(e) => patchEmployment({ missedWorkTo: e.target.value })}
            />
          </Field>
        </div>

        <hr style={{ margin: "18px 0" }} />

        <Field label="Did the crime cause a disability that affects work?" hint="If unsure, choose Unknown.">
          <YesNoUnknownSelect
            value={employment.disabilityFromCrime}
            onChange={(v) => patchEmployment({ disabilityFromCrime: v })}
          />
        </Field>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 6 }}>
          {error ? <span style={{ color: "crimson", marginRight: "auto" }}>{error}</span> : null}

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
      </div>
    </IntakeShell>
  );
}