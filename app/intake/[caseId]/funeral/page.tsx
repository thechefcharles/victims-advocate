// app/intake/[caseId]/funeral/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { IntakeShell } from "@/components/intake/IntakeShell";
import { Field, TextInput } from "@/components/intake/fields";

import type { CaseData } from "@/lib/intake/types";
import { loadCaseDraft, saveCaseDraft } from "@/lib/intake/api";
import { nextStep, stepHref } from "@/lib/intake/steps";
import { useI18n } from "@/components/i18n/i18nProvider";

type YesNoUnknown = "yes" | "no" | "unknown";

function YesNoUnknownSelect({
  value,
  onChange,
  t,
}: {
  value: YesNoUnknown | undefined;
  onChange: (v: YesNoUnknown) => void;
  t: (k: string, vars?: Record<string, any>) => string;
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
      <option value="unknown">{t("ui.status.unknown")}</option>
      <option value="yes">{t("ui.status.yes")}</option>
      <option value="no">{t("ui.status.no")}</option>
    </select>
  );
}

export default function FuneralPage() {
  const params = useParams();
  const raw = (params as any)?.caseId;
  const caseId: string | undefined = Array.isArray(raw) ? raw[0] : raw;

  const router = useRouter();
  const { t } = useI18n();

  const [draft, setDraft] = useState<CaseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const funeral = useMemo(() => draft?.funeral ?? {}, [draft]);
  const dependents = useMemo(() => funeral.dependents ?? {}, [funeral]);

  useEffect(() => {
    if (!caseId) {
      setLoading(false);
      setError(t("intake.errors.missingCaseId"));
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
        setError(e?.message ?? t("forms.funeral.loadFailed"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [caseId, t]);

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
    if (!draft) return;

    if (!caseId) {
      setError(t("intake.errors.missingCaseIdShort"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveCaseDraft(caseId, draft);

      if (goNext) {
        const nxt = nextStep("funeral");
        if (nxt) router.push(stepHref(caseId, nxt));
      }
    } catch (e: any) {
      setError(e?.message ?? t("ui.errors.generic"));
    } finally {
      setSaving(false);
    }
  }

  if (!caseId) {
    return (
      <IntakeShell
        title={t("forms.funeral.title")}
        description={t("intake.errors.missingCaseId")}
      >
        <p style={{ color: "crimson" }}>{error ?? t("intake.errors.missingCaseIdShort")}</p>
      </IntakeShell>
    );
  }

  if (loading) {
    return (
      <IntakeShell title={t("forms.funeral.title")} description={t("forms.funeral.descriptionDraft")}>
        <p>{t("common.loading")}</p>
      </IntakeShell>
    );
  }

  if (!draft) {
    return (
      <IntakeShell title={t("forms.funeral.title")} description={t("forms.funeral.descriptionDraft")}>
        <p style={{ color: "crimson" }}>{error ?? t("forms.funeral.noDraft")}</p>
      </IntakeShell>
    );
  }

  return (
    <IntakeShell title={t("forms.funeral.title")} description={t("forms.funeral.description")}>
      {/* Footer buttons inside page content (since IntakeShell does not accept footer props in your project) */}
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
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
          {saving ? t("ui.buttons.saving") : t("ui.buttons.save")}
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
          {saving ? t("ui.buttons.saving") : t("forms.funeral.saveContinue")}
        </button>
      </div>

      <Field
        label={t("forms.funeral.victimDeceasedLabel")}
        hint={t("forms.funeral.unknownHint")}
      >
        <YesNoUnknownSelect
          value={funeral.victimDeceased}
          onChange={(v) => patchFuneral({ victimDeceased: v })}
          t={t}
        />
      </Field>

      <hr style={{ margin: "18px 0" }} />

      <h2 style={{ margin: "8px 0 10px" }}>{t("forms.funeral.funeralHomeTitle")}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label={t("forms.funeral.funeralHomeNameLabel")}>
          <TextInput
            value={funeral.funeralHomeName ?? ""}
            onChange={(e) => patchFuneral({ funeralHomeName: e.target.value })}
            placeholder={t("forms.funeral.funeralHomeNamePlaceholder")}
          />
        </Field>

        <Field label={t("forms.funeral.funeralHomePhoneLabel")}>
          <TextInput
            value={funeral.funeralHomePhone ?? ""}
            onChange={(e) => patchFuneral({ funeralHomePhone: e.target.value })}
            placeholder={t("forms.funeral.funeralHomePhonePlaceholder")}
          />
        </Field>
      </div>

      <hr style={{ margin: "18px 0" }} />

      <h2 style={{ margin: "8px 0 10px" }}>{t("forms.funeral.dependentsTitle")}</h2>

      <Field
        label={t("forms.funeral.hasDependentsLabel")}
        hint={t("forms.funeral.hasDependentsHint")}
      >
        <YesNoUnknownSelect
          value={(dependents as any).hasDependents}
          onChange={(v) => patchDependents({ hasDependents: v } as any)}
          t={t}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label={t("forms.funeral.dependentsCountLabel")}>
          <TextInput
            inputMode="numeric"
            value={
              (dependents as any).count === null || (dependents as any).count === undefined
                ? ""
                : String((dependents as any).count)
            }
            onChange={(e) => {
              const rawVal = e.target.value.trim();
              if (rawVal === "") return patchDependents({ count: undefined } as any);
              const num = Number(rawVal.replace(/[^0-9]/g, ""));
              patchDependents({ count: Number.isFinite(num) ? num : undefined } as any);
            }}
            placeholder={t("forms.funeral.dependentsCountPlaceholder")}
          />
        </Field>

        <Field label={t("forms.funeral.dependentsNotesLabel")}>
          <TextInput
            value={(dependents as any).notes ?? ""}
            onChange={(e) => patchDependents({ notes: e.target.value } as any)}
            placeholder={t("forms.funeral.dependentsNotesPlaceholder")}
          />
        </Field>
      </div>
    </IntakeShell>
  );
}