// app/intake/[caseId]/funeral/page.tsx
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

export default function FuneralPage() {
  // ✅ FIX: robust caseId extraction (string | string[] | undefined)
  const params = useParams();
  const raw = (params as any)?.caseId;
  const caseId: string | undefined = Array.isArray(raw) ? raw[0] : raw;

  const router = useRouter();

  const [draft, setDraft] = useState<CaseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const funeral = useMemo(() => draft?.funeral ?? {}, [draft]);
  const dependents = funeral.dependents ?? {};

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
        setError(e?.message ?? "Failed to load funeral section.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [caseId]);

  function patchFuneral(patch: Partial<NonNullable<CaseData["funeral"]>>) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        funeral: {
          ...(prev.funeral ?? ({} as any)),
          ...patch,
        },
      };
    });
  }

  function patchDependents(
    patch: Partial<NonNullable<NonNullable<CaseData["funeral"]>["dependents"]>>
  ) {
    setDraft((prev) => {
      if (!prev) return prev;
      const f = prev.funeral ?? ({} as any);
      const d = f.dependents ?? {};
      return {
        ...prev,
        funeral: {
          ...f,
          dependents: {
            ...d,
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
        const nxt = nextStep("funeral");
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
        title="Funeral & dependents"
        description="Funeral/burial details and dependent information (if applicable)."
      >
        <p>Loading…</p>
      </IntakeShell>
    );
  }

  if (!draft) {
    return (
      <IntakeShell
        title="Funeral & dependents"
        description="Funeral/burial details and dependent information (if applicable)."
      >
        <p style={{ color: "crimson" }}>{error ?? "No case draft loaded."}</p>
      </IntakeShell>
    );
  }

  return (
    <IntakeShell
      title="Funeral & dependents"
      description="If the victim passed away or there are dependents affected by the crime, add what you know here."
    >
      {/* Footer buttons inside page content (since IntakeShell does not accept footer props in your project) */}
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

      <Field label="Was the victim deceased as a result of the crime?" hint="If unsure, choose Unknown.">
        <YesNoUnknownSelect
          value={funeral.victimDeceased}
          onChange={(v) => patchFuneral({ victimDeceased: v })}
        />
      </Field>

      <hr style={{ margin: "18px 0" }} />

      <h2 style={{ margin: "8px 0 10px" }}>Funeral home</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Funeral home name (optional)">
          <TextInput
            value={funeral.funeralHomeName ?? ""}
            onChange={(e) => patchFuneral({ funeralHomeName: e.target.value })}
            placeholder="Name"
          />
        </Field>

        <Field label="Funeral home phone (optional)">
          <TextInput
            value={funeral.funeralHomePhone ?? ""}
            onChange={(e) => patchFuneral({ funeralHomePhone: e.target.value })}
            placeholder="(xxx) xxx-xxxx"
          />
        </Field>
      </div>

      <hr style={{ margin: "18px 0" }} />

      <h2 style={{ margin: "8px 0 10px" }}>Dependents</h2>

      <Field
        label="Are there dependents who relied on the victim for support?"
        hint="For example: children, spouse, or other dependents."
      >
        <YesNoUnknownSelect
          value={dependents.hasDependents}
          onChange={(v) => patchDependents({ hasDependents: v })}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="How many dependents? (optional)">
          <TextInput
            inputMode="numeric"
            value={
              dependents.count === null || dependents.count === undefined
                ? ""
                : String(dependents.count)
            }
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === "") return patchDependents({ count: undefined });
              const num = Number(raw.replace(/[^0-9]/g, ""));
              patchDependents({ count: Number.isFinite(num) ? num : undefined });
            }}
            placeholder="e.g. 2"
          />
        </Field>

        <Field label="Notes about dependents (optional)">
          <TextInput
            value={dependents.notes ?? ""}
            onChange={(e) => patchDependents({ notes: e.target.value })}
            placeholder="Anything helpful to know…"
          />
        </Field>
      </div>
    </IntakeShell>
  );
}