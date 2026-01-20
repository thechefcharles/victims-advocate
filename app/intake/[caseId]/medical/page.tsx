// app/intake/[caseId]/medical/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { IntakeShell } from "@/components/intake/IntakeShell";
import { Field, TextInput } from "@/components/intake/fields";
import { useI18n } from "@/components/i18n/i18nProvider";

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
  const params = useParams();
  const raw = (params as any)?.caseId;
  const caseId: string | undefined = Array.isArray(raw) ? raw[0] : raw;

  const router = useRouter();
  const { t } = useI18n();

  const [draft, setDraft] = useState<CaseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const medical = useMemo(() => draft?.medical ?? {}, [draft]);
  const counseling = medical.counseling ?? {};

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
        setError(e?.message ?? t("forms.medical.loadFailed"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    patch: Partial<NonNullable<NonNullable<CaseData["medical"]>["counseling"]>>
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
    if (!draft) return;

    if (!caseId) {
      setError(t("intake.errors.missingCaseId"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveCaseDraft(caseId, draft);

      if (goNext) {
        const nxt = nextStep("medical");
        if (nxt) router.push(stepHref(caseId, nxt));
      }
    } catch (e: any) {
      setError(e?.message ?? t("intake.save.failed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <IntakeShell
        title={t("forms.medical.title")}
        description={t("forms.medical.descriptionDraft")}
      >
        <p>{t("common.loading")}</p>
      </IntakeShell>
    );
  }

  if (!draft) {
    return (
      <IntakeShell
        title={t("forms.medical.title")}
        description={t("forms.medical.descriptionDraft")}
      >
        <p style={{ color: "crimson" }}>{error ?? t("forms.medical.noDraft")}</p>
      </IntakeShell>
    );
  }

  return (
    <IntakeShell
      title={t("forms.medical.title")}
      description={t("forms.medical.description")}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
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
          {saving ? t("ui.buttons.saving") : t("forms.medical.saveContinue")}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field
          label={t("forms.medical.questions.hasMedicalTreatment")}
          hint={t("forms.medical.hints.unknownOk")}
        >
          <YesNoUnknownSelect
            value={medical.hasMedicalTreatment}
            onChange={(v) => patchMedical({ hasMedicalTreatment: v })}
          />
        </Field>

        <Field
          label={t("forms.medical.questions.hasCounseling")}
          hint={t("forms.medical.hints.unknownOk")}
        >
          <YesNoUnknownSelect
            value={counseling.hasCounseling}
            onChange={(v) => patchCounseling({ hasCounseling: v })}
          />
        </Field>
      </div>

      <hr style={{ margin: "18px 0" }} />

      <h2 style={{ margin: "8px 0 10px" }}>{t("forms.medical.sections.medical")}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label={t("forms.medical.fields.hospitalName")}>
          <TextInput
            value={medical.hospitalName ?? ""}
            onChange={(e) => patchMedical({ hospitalName: e.target.value })}
            placeholder={t("forms.medical.placeholders.hospitalName")}
          />
        </Field>

        <Field label={t("forms.medical.fields.hospitalCity")}>
          <TextInput
            value={medical.hospitalCity ?? ""}
            onChange={(e) => patchMedical({ hospitalCity: e.target.value })}
            placeholder={t("forms.medical.placeholders.hospitalCity")}
          />
        </Field>

        <Field
          label={t("forms.medical.fields.treatmentStart")}
          hint={t("forms.medical.hints.dateFormat")}
        >
          <TextInput
            type="date"
            value={medical.treatmentStart ?? ""}
            onChange={(e) => patchMedical({ treatmentStart: e.target.value })}
          />
        </Field>

        <Field
          label={t("forms.medical.fields.treatmentEnd")}
          hint={t("forms.medical.hints.dateFormat")}
        >
          <TextInput
            type="date"
            value={medical.treatmentEnd ?? ""}
            onChange={(e) => patchMedical({ treatmentEnd: e.target.value })}
          />
        </Field>
      </div>

      <hr style={{ margin: "18px 0" }} />

      <h2 style={{ margin: "8px 0 10px" }}>{t("forms.medical.sections.counseling")}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label={t("forms.medical.fields.providerName")}>
          <TextInput
            value={counseling.providerName ?? ""}
            onChange={(e) => patchCounseling({ providerName: e.target.value })}
            placeholder={t("forms.medical.placeholders.providerName")}
          />
        </Field>

        <Field label={t("forms.medical.fields.sessionsCount")}>
          <TextInput
            inputMode="numeric"
            value={
              counseling.sessionsCount === null ||
              counseling.sessionsCount === undefined
                ? ""
                : String(counseling.sessionsCount)
            }
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === "") return patchCounseling({ sessionsCount: undefined });
              const num = Number(raw.replace(/[^0-9]/g, ""));
              patchCounseling({ sessionsCount: Number.isFinite(num) ? num : undefined });
            }}
            placeholder={t("forms.medical.placeholders.sessionsCount")}
          />
        </Field>
      </div>
    </IntakeShell>
  );
}