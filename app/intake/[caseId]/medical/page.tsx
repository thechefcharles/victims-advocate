// app/intake/[caseId]/medical/page.tsx
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

export default function MedicalPage() {
  // ✅ robust caseId extraction
  const params = useParams();
  const raw = (params as any)?.caseId;
  const caseId: string | undefined = Array.isArray(raw) ? raw[0] : raw;

  const router = useRouter();

  const [draft, setDraft] = useState<CaseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const medical = useMemo(() => draft?.medical ?? {}, [draft]);
  const counseling = medical.counseling ?? {};

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

        setDraft(d ?? null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load medical section.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [caseId]);

  function patchMedical(patch: Partial<NonNullable<CaseData["medical"]>>) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        medical: {
          ...(prev.medical ?? ({} as any)),
          ...patch,
        },
      };
    });
  }

  function patchCounseling(
    patch: Partial<
      NonNullable<NonNullable<CaseData["medical"]>["counseling"]>
    >
  ) {
    setDraft((prev) => {
      if (!prev) return prev;
      const m = prev.medical ?? ({} as any);
      const c = m.counseling ?? {};
      return {
        ...prev,
        medical: {
          ...m,
          counseling: {
            ...c,
            ...patch,
          },
        },
      };
    });
  }

  async function handleSave(goNext?: boolean) {
    if (!draft || !caseId) return;

    setSaving(true);
    setError(null);

    try {
      await saveCaseDraft(caseId, draft);

      if (goNext) {
        const nxt = nextStep("medical");
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
        title="Medical & counseling"
        description="Treatment details and counseling information (if applicable)."
      >
        <p>Loading…</p>
      </IntakeShell>
    );
  }

  if (!draft) {
    return (
      <IntakeShell
        title="Medical & counseling"
        description="Treatment details and counseling information (if applicable)."
      >
        <p style={{ color: "crimson" }}>
          {error ?? "No case draft loaded."}
        </p>
      </IntakeShell>
    );
  }

  return (
    <IntakeShell
      title="Medical & counseling"
      description="Add any treatment and counseling details you know. If you don’t know something, leave it blank."
    >
      {/* Buttons (since IntakeShell does not accept footer props in your project) */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginBottom: 16 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Did the victim receive medical treatment?" hint="If unsure, choose Unknown.">
          <YesNoUnknownSelect
            value={medical.hasMedicalTreatment}
            onChange={(v) => patchMedical({ hasMedicalTreatment: v })}
          />
        </Field>

        <Field label="Did the victim receive counseling / therapy?" hint="If unsure, choose Unknown.">
          <YesNoUnknownSelect
            value={counseling.hasCounseling}
            onChange={(v) => patchCounseling({ hasCounseling: v })}
          />
        </Field>
      </div>

      <hr style={{ margin: "18px 0" }} />

      <h2 style={{ margin: "8px 0 10px" }}>Medical treatment</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Hospital / facility name (optional)">
          <TextInput
            value={medical.hospitalName ?? ""}
            onChange={(e) => patchMedical({ hospitalName: e.target.value })}
            placeholder="Hospital, clinic, urgent care, etc."
          />
        </Field>

        <Field label="Hospital / facility city (optional)">
          <TextInput
            value={medical.hospitalCity ?? ""}
            onChange={(e) => patchMedical({ hospitalCity: e.target.value })}
            placeholder="City"
          />
        </Field>

        <Field label="Treatment start date (optional)" hint="YYYY-MM-DD">
          <TextInput
            value={medical.treatmentStart ?? ""}
            onChange={(e) => patchMedical({ treatmentStart: e.target.value })}
            placeholder="YYYY-MM-DD"
          />
        </Field>

        <Field label="Treatment end date (optional)" hint="YYYY-MM-DD">
          <TextInput
            value={medical.treatmentEnd ?? ""}
            onChange={(e) => patchMedical({ treatmentEnd: e.target.value })}
            placeholder="YYYY-MM-DD"
          />
        </Field>
      </div>

      <hr style={{ margin: "18px 0" }} />

      <h2 style={{ margin: "8px 0 10px" }}>Counseling</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Counselor / provider name (optional)">
          <TextInput
            value={counseling.providerName ?? ""}
            onChange={(e) => patchCounseling({ providerName: e.target.value })}
            placeholder="Therapist, clinic, program, etc."
          />
        </Field>

        <Field label="Number of sessions (optional)">
          <TextInput
            inputMode="numeric"
            value={
              counseling.sessionsCount === null || counseling.sessionsCount === undefined
                ? ""
                : String(counseling.sessionsCount)
            }
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === "") return patchCounseling({ sessionsCount: undefined });
              const num = Number(raw.replace(/[^0-9]/g, ""));
              patchCounseling({ sessionsCount: Number.isFinite(num) ? num : undefined });
            }}
            placeholder="e.g. 8"
          />
        </Field>
      </div>
    </IntakeShell>
  );
}