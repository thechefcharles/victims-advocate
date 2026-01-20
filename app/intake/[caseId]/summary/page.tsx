// app/intake/[caseId]/summary/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { IntakeShell } from "@/components/intake/IntakeShell";
import { Field, TextInput } from "@/components/intake/fields";
import { useI18n } from "@/components/i18n/i18nProvider";

import type { CaseData } from "@/lib/intake/types";
import { loadCaseDraft, saveCaseDraft } from "@/lib/intake/api";

type YesNoUnknown = "yes" | "no" | "unknown";

function formatYN(
  value: YesNoUnknown | undefined,
  t: (k: string, vars?: Record<string, any>) => string
) {
  if (value === "yes") return t("ui.status.yes");
  if (value === "no") return t("ui.status.no");
  if (value === "unknown") return t("ui.status.unknown");
  return t("ui.status.notProvided");
}

export default function SummaryPage() {
  const params = useParams();
  const raw = (params as any)?.caseId;
  const caseId: string | undefined = Array.isArray(raw) ? raw[0] : raw;

const { t, tf } = useI18n();

  const [draft, setDraft] = useState<CaseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NOTE: Certification is UI-only for now (not persisted in CaseData).
  const [certFullName, setCertFullName] = useState("");
  const [certDate, setCertDate] = useState("");
  const [certAgreeTruthful, setCertAgreeTruthful] = useState(false);
  const [certAgreeRelease, setCertAgreeRelease] = useState(false);

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
        setError(e?.message ?? t("forms.summary.loadFailed"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function handleSave() {
    if (!draft) return;

    if (!caseId) {
      setError(t("intake.errors.missingCaseId"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveCaseDraft(caseId, {
        ...draft,
        lastSavedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      setError(e?.message ?? t("intake.save.failed"));
    } finally {
      setSaving(false);
    }
  }

  const safe = useMemo(() => {
    const v = draft?.victim ?? ({} as any);
    const a = draft?.applicant ?? ({} as any);
    const c = draft?.crime ?? ({} as any);
    const l = draft?.losses ?? ({} as any);
    const m = draft?.medical ?? ({} as any);
    const e = draft?.employment ?? ({} as any);
    const f = draft?.funeral ?? ({} as any);
    const d = draft?.documents ?? ({} as any);
    const uploads = d.uploads ?? {};
    return { v, a, c, l, m, e, f, d, uploads };
  }, [draft]);

  if (loading) {
    return (
      <IntakeShell title={t("forms.summary.title")} description={t("forms.summary.descriptionDraft")}>
        <p>{t("common.loading")}</p>
      </IntakeShell>
    );
  }

  if (!draft) {
    return (
      <IntakeShell title={t("forms.summary.title")} description={t("forms.summary.descriptionDraft")}>
        <p style={{ color: "crimson" }}>{error ?? t("forms.summary.noDraft")}</p>
      </IntakeShell>
    );
  }

  return (
    <IntakeShell title={t("forms.summary.title")} description={t("forms.summary.description")}>
      {/* Save row */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginBottom: 16 }}>
        {error ? <span style={{ color: "crimson", marginRight: "auto" }}>{error}</span> : null}

        <button
          onClick={handleSave}
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
          {saving ? t("ui.buttons.saving") : t("forms.summary.save")}
        </button>
      </div>

      {/* Victim */}
      <h2>{t("forms.summary.sections.victim")}</h2>
      <ul style={{ color: "#333" }}>
        <li>
          {t("forms.summary.labels.name")}: {safe.v.firstName ?? "—"} {safe.v.lastName ?? ""}
        </li>
        <li>{t("forms.summary.labels.dob")}: {safe.v.dateOfBirth ?? "—"}</li>
        <li>{t("forms.summary.labels.phone")}: {safe.v.phone ?? "—"}</li>
        <li>{t("forms.summary.labels.email")}: {safe.v.email ?? "—"}</li>
        <li>
          {t("forms.summary.labels.address")}: {safe.v.address1 ?? "—"}
          {safe.v.city ? `, ${safe.v.city}` : ""}
          {safe.v.state ? `, ${safe.v.state}` : ""} {safe.v.zip ?? ""}
        </li>
      </ul>

      {/* Applicant */}
      <h2>{t("forms.summary.sections.applicant")}</h2>
      <ul style={{ color: "#333" }}>
        <li>
          {t("forms.summary.labels.isVictimAlsoApplicant")}:{" "}
          {formatYN(safe.a.isVictimAlsoApplicant, t)}
        </li>
        <li>
          {t("forms.summary.labels.relationshipToVictim")}: {safe.a.relationshipToVictim ?? "—"}
        </li>
        <li>
          {t("forms.summary.labels.name")}: {safe.a.firstName ?? "—"} {safe.a.lastName ?? ""}
        </li>
      </ul>

      {/* Crime */}
      <h2>{t("forms.summary.sections.crime")}</h2>
      <ul style={{ color: "#333" }}>
        <li>{t("forms.summary.labels.date")}: {safe.c.incidentDate ?? "—"}</li>
        <li>{t("forms.summary.labels.time")}: {safe.c.incidentTime ?? "—"}</li>
        <li>
          {t("forms.summary.labels.location")}: {safe.c.locationCity ?? "—"}
          {safe.c.locationState ? `, ${safe.c.locationState}` : ""}
        </li>
        <li>
          {t("forms.summary.labels.reportedToPolice")}: {formatYN(safe.c.policeReported, t)}
        </li>
        <li>{t("forms.summary.labels.policeDepartment")}: {safe.c.policeDepartment ?? "—"}</li>
        <li>{t("forms.summary.labels.reportNumber")}: {safe.c.policeReportNumber ?? "—"}</li>
      </ul>

      {/* Losses */}
      <h2>{t("forms.summary.sections.losses")}</h2>
      <ul style={{ color: "#333" }}>
        <li>{t("forms.summary.losses.medical")}: {safe.l.wantsMedical ? t("ui.status.yes") : t("ui.status.no")}</li>
        <li>{t("forms.summary.losses.counseling")}: {safe.l.wantsCounseling ? t("ui.status.yes") : t("ui.status.no")}</li>
        <li>{t("forms.summary.losses.funeral")}: {safe.l.wantsFuneral ? t("ui.status.yes") : t("ui.status.no")}</li>
        <li>{t("forms.summary.losses.lostWages")}: {safe.l.wantsLostWages ? t("ui.status.yes") : t("ui.status.no")}</li>
        <li>{t("forms.summary.losses.relocation")}: {safe.l.wantsRelocation ? t("ui.status.yes") : t("ui.status.no")}</li>
        <li>{t("forms.summary.losses.propertyLoss")}: {safe.l.wantsPropertyLoss ? t("ui.status.yes") : t("ui.status.no")}</li>
        <li>
          {t("forms.summary.losses.other")}:{" "}
          {safe.l.wantsOther
            ? tf("forms.summary.losses.otherYes", { desc: safe.l.otherDescription ?? "—" })
            : t("ui.status.no")}
        </li>
        <li>{t("forms.summary.losses.estimatedTotal")}: {safe.l.estimatedTotal ?? "—"}</li>
      </ul>

      {/* Medical */}
      <h2>{t("forms.summary.sections.medical")}</h2>
      <ul style={{ color: "#333" }}>
        <li>{t("forms.summary.medical.medicalTreatment")}: {formatYN(safe.m.hasMedicalTreatment, t)}</li>
        <li>{t("forms.summary.medical.hospital")}: {safe.m.hospitalName ?? "—"}</li>
        <li>{t("forms.summary.medical.city")}: {safe.m.hospitalCity ?? "—"}</li>
        <li>
          {t("forms.summary.medical.treatmentDates")}: {safe.m.treatmentStart ?? "—"}{" "}
          {t("forms.summary.labels.to")} {safe.m.treatmentEnd ?? "—"}
        </li>
        <li>{t("forms.summary.medical.counseling")}: {formatYN(safe.m.counseling?.hasCounseling, t)}</li>
        <li>{t("forms.summary.medical.provider")}: {safe.m.counseling?.providerName ?? "—"}</li>
        <li>{t("forms.summary.medical.sessions")}: {safe.m.counseling?.sessionsCount ?? "—"}</li>
      </ul>

      {/* Employment */}
      <h2>{t("forms.summary.sections.employment")}</h2>
      <ul style={{ color: "#333" }}>
        <li>{t("forms.summary.employment.employedAtTime")}: {formatYN(safe.e.employedAtTime, t)}</li>
        <li>{t("forms.summary.employment.employer")}: {safe.e.employerName ?? "—"}</li>
        <li>{t("forms.summary.employment.missedWork")}: {formatYN(safe.e.missedWork, t)}</li>
        <li>
          {t("forms.summary.employment.missedDates")}: {safe.e.missedWorkFrom ?? "—"}{" "}
          {t("forms.summary.labels.to")} {safe.e.missedWorkTo ?? "—"}
        </li>
        <li>{t("forms.summary.employment.disabilityFromCrime")}: {formatYN(safe.e.disabilityFromCrime, t)}</li>
      </ul>

      {/* Funeral */}
      <h2>{t("forms.summary.sections.funeral")}</h2>
      <ul style={{ color: "#333" }}>
        <li>{t("forms.summary.funeral.victimDeceased")}: {formatYN(safe.f.victimDeceased, t)}</li>
        <li>{t("forms.summary.funeral.funeralHome")}: {safe.f.funeralHomeName ?? "—"}</li>
        <li>{t("forms.summary.funeral.funeralPhone")}: {safe.f.funeralHomePhone ?? "—"}</li>
        <li>{t("forms.summary.funeral.dependentsPresent")}: {formatYN(safe.f.dependents?.hasDependents, t)}</li>
        <li>{t("forms.summary.funeral.dependentCount")}: {safe.f.dependents?.count ?? "—"}</li>
        <li>{t("forms.summary.funeral.dependentNotes")}: {safe.f.dependents?.notes ?? "—"}</li>
      </ul>

      {/* Documents */}
      <h2>{t("forms.summary.sections.documents")}</h2>
      <ul style={{ color: "#333" }}>
        <li>{t("forms.summary.documents.policeReports")}: {safe.uploads.policeReport?.length ?? 0}</li>
        <li>{t("forms.summary.documents.medicalBills")}: {safe.uploads.medicalBills?.length ?? 0}</li>
        <li>{t("forms.summary.documents.counselingBills")}: {safe.uploads.counselingBills?.length ?? 0}</li>
        <li>{t("forms.summary.documents.funeralBills")}: {safe.uploads.funeralBills?.length ?? 0}</li>
        <li>{t("forms.summary.documents.wageProof")}: {safe.uploads.wageProof?.length ?? 0}</li>
        <li>{t("forms.summary.documents.other")}: {safe.uploads.other?.length ?? 0}</li>
        <li>{t("forms.summary.documents.notes")}: {safe.d.notes ?? "—"}</li>
      </ul>

      <hr style={{ margin: "18px 0" }} />

      {/* Certification */}
      <h2>{t("forms.summary.sections.certification")}</h2>
      <p style={{ color: "#666" }}>{t("forms.summary.certification.disclaimer")}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label={t("forms.summary.certification.fullNameLabel")}>
          <TextInput
            value={certFullName}
            onChange={(e) => setCertFullName(e.target.value)}
            placeholder={t("forms.summary.certification.fullNamePlaceholder")}
          />
        </Field>

        <Field label={t("forms.summary.certification.dateLabel")}>
          <TextInput
            type="date"
            value={certDate}
            onChange={(e) => setCertDate(e.target.value)}
          />
        </Field>
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={certAgreeTruthful}
          onChange={(e) => setCertAgreeTruthful(e.target.checked)}
        />
        <span>{t("forms.summary.certification.truthfulLabel")}</span>
      </label>

      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={certAgreeRelease}
          onChange={(e) => setCertAgreeRelease(e.target.checked)}
        />
        <span>{t("forms.summary.certification.releaseLabel")}</span>
      </label>
    </IntakeShell>
  );
}