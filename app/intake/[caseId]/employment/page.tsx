// app/intake/[caseId]/employment/page.tsx
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

export default function EmploymentPage() {
  const params = useParams();
  const raw = (params as any)?.caseId;
  const caseId: string | undefined = Array.isArray(raw) ? raw[0] : raw;

  const router = useRouter();
  const { t } = useI18n();

  const [draft, setDraft] = useState<CaseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const employment = useMemo(() => draft?.employment ?? {}, [draft]);

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
        setError(e?.message ?? t("forms.employment.loadFailed"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [caseId, t]);

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

    if (!caseId) {
      setError(t("intake.errors.missingCaseId"));
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
      setError(e?.message ?? t("ui.errors.generic"));
    } finally {
      setSaving(false);
    }
  }

  if (!caseId) {
    return (
      <IntakeShell
        caseId="missing"
        step="employment"
        title={t("forms.employment.title")}
        description={t("intake.errors.missingCaseIdShort")}
      >
        <p style={{ color: "crimson" }}>{error ?? t("intake.errors.missingCaseIdShort")}</p>
      </IntakeShell>
    );
  }

  if (loading) {
    return (
      <IntakeShell
        caseId={caseId}
        step="employment"
        title={t("forms.employment.title")}
        description={t("forms.employment.descriptionDraft")}
      >
        <p>{t("common.loading")}</p>
      </IntakeShell>
    );
  }

  if (!draft) {
    return (
      <IntakeShell
        caseId={caseId}
        step="employment"
        title={t("forms.employment.title")}
        description={t("forms.employment.descriptionDraft")}
      >
        <p style={{ color: "crimson" }}>{error ?? t("forms.employment.noDraft")}</p>
      </IntakeShell>
    );
  }

  return (
    <IntakeShell
      caseId={caseId}
      step="employment"
      title={t("forms.employment.title")}
      description={t("forms.employment.description")}
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
            {saving ? t("ui.buttons.saving") : t("forms.employment.saveContinue")}
          </button>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <Field label={t("forms.employment.employedAtTimeLabel")} hint={t("forms.employment.unknownHint")}>
          <YesNoUnknownSelect
            t={t}
            value={employment.employedAtTime}
            onChange={(v) => patchEmployment({ employedAtTime: v })}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label={t("forms.employment.employerNameLabel")}>
            <TextInput
              value={employment.employerName ?? ""}
              onChange={(e) => patchEmployment({ employerName: e.target.value })}
              placeholder={t("forms.employment.employerNamePlaceholder")}
            />
          </Field>

          <Field label={t("forms.employment.employerPhoneLabel")}>
            <TextInput
              value={employment.employerPhone ?? ""}
              onChange={(e) => patchEmployment({ employerPhone: e.target.value })}
              placeholder={t("forms.employment.employerPhonePlaceholder")}
            />
          </Field>

          <Field label={t("forms.employment.employerAddressLabel")}>
            <TextInput
              value={employment.employerAddress ?? ""}
              onChange={(e) => patchEmployment({ employerAddress: e.target.value })}
              placeholder={t("forms.employment.employerAddressPlaceholder")}
            />
          </Field>
        </div>

        <hr style={{ margin: "18px 0" }} />

        <Field label={t("forms.employment.missedWorkLabel")} hint={t("forms.employment.unknownHint")}>
          <YesNoUnknownSelect
            t={t}
            value={employment.missedWork}
            onChange={(v) => patchEmployment({ missedWork: v })}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label={t("forms.employment.missedWorkFromLabel")}>
            <TextInput
              type="date"
              value={employment.missedWorkFrom ?? ""}
              onChange={(e) => patchEmployment({ missedWorkFrom: e.target.value })}
            />
          </Field>

          <Field label={t("forms.employment.missedWorkToLabel")}>
            <TextInput
              type="date"
              value={employment.missedWorkTo ?? ""}
              onChange={(e) => patchEmployment({ missedWorkTo: e.target.value })}
            />
          </Field>
        </div>

        <hr style={{ margin: "18px 0" }} />

        <Field label={t("forms.employment.disabilityFromCrimeLabel")} hint={t("forms.employment.unknownHint")}>
          <YesNoUnknownSelect
            t={t}
            value={employment.disabilityFromCrime}
            onChange={(v) => patchEmployment({ disabilityFromCrime: v })}
          />
        </Field>
      </div>
    </IntakeShell>
  );
}