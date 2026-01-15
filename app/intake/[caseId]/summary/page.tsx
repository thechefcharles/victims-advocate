// app/intake/[caseId]/summary/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { IntakeShell } from "@/components/intake/IntakeShell";
import { Field, TextInput } from "@/components/intake/fields";

import type { CaseData } from "@/lib/intake/types";
import { loadCaseDraft, saveCaseDraft } from "@/lib/intake/api";

function formatYN(value: any) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "unknown") return "Unknown";
  return "Not provided";
}

export default function SummaryPage() {
  // ✅ robust caseId extraction
  const params = useParams();
  const raw = (params as any)?.caseId;
  const caseId: string | undefined = Array.isArray(raw) ? raw[0] : raw;

  const [draft, setDraft] = useState<CaseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Certification does not exist in your CaseData types.
  // We'll store it under a safe "meta" spot in CaseData: lastSavedAt/completedSteps are defined,
  // but no certification exists. To avoid red, we keep certification local only (UI-only).
  const [certFullName, setCertFullName] = useState("");
  const [certDate, setCertDate] = useState("");
  const [certAgreeTruthful, setCertAgreeTruthful] = useState(false);
  const [certAgreeRelease, setCertAgreeRelease] = useState(false);

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
        setError(e?.message ?? "Failed to load summary.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [caseId]);

  async function handleSave() {
    if (!draft || !caseId) return;

    setSaving(true);
    setError(null);

    try {
      // ✅ Only save CaseData fields that actually exist.
      // If you want to persist certification later, we must add it to CaseData types + defaults + API merge.
      await saveCaseDraft(caseId, {
        ...draft,
        lastSavedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      setError(e?.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <IntakeShell
        title="Summary"
        description="Review your case before generating documents."
      >
        <p>Loading…</p>
      </IntakeShell>
    );
  }

  if (!draft) {
    return (
      <IntakeShell
        title="Summary"
        description="Review your case before generating documents."
      >
        <p style={{ color: "crimson" }}>{error ?? "No case draft loaded."}</p>
      </IntakeShell>
    );
  }

  const victim = draft.victim ?? ({} as any);
  const applicant = draft.applicant ?? ({} as any);
  const crime = draft.crime ?? ({} as any);
  const losses = draft.losses ?? ({} as any);
  const medical = draft.medical ?? ({} as any);
  const employment = draft.employment ?? ({} as any);
  const funeral = draft.funeral ?? ({} as any);
  const documents = draft.documents ?? ({} as any);
  const uploads = documents.uploads ?? {};

  return (
    <IntakeShell
      title="Summary"
      description="Review what you’ve entered. You can go back to any section to edit."
    >
      {/* Save button row (since IntakeShell has no footer prop) */}
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
          {saving ? "Saving…" : "Save summary"}
        </button>
      </div>

      <h2>Victim</h2>
      <ul style={{ color: "#333" }}>
        <li>
          Name: {victim.firstName ?? "—"} {victim.lastName ?? ""}
        </li>
        <li>DOB: {victim.dateOfBirth ?? "—"}</li>
        <li>Phone: {victim.phone ?? "—"}</li>
        <li>Email: {victim.email ?? "—"}</li>
        <li>
          Address: {victim.address1 ?? "—"} {victim.city ? `, ${victim.city}` : ""}{" "}
          {victim.state ? `, ${victim.state}` : ""} {victim.zip ?? ""}
        </li>
      </ul>

      <h2>Applicant</h2>
      <ul style={{ color: "#333" }}>
        <li>Is victim also applicant: {formatYN(applicant.isVictimAlsoApplicant)}</li>
        <li>Relationship to victim: {applicant.relationshipToVictim ?? "—"}</li>
        <li>
          Name: {applicant.firstName ?? "—"} {applicant.lastName ?? ""}
        </li>
      </ul>

      <h2>Crime / incident</h2>
      <ul style={{ color: "#333" }}>
        <li>Date: {crime.incidentDate ?? "—"}</li>
        <li>Time: {crime.incidentTime ?? "—"}</li>
        <li>
          Location: {crime.locationCity ?? "—"}
          {crime.locationState ? `, ${crime.locationState}` : ""}
        </li>
        <li>Reported to police: {formatYN(crime.policeReported)}</li>
        <li>Police department: {crime.policeDepartment ?? "—"}</li>
        <li>Report number: {crime.policeReportNumber ?? "—"}</li>
      </ul>

      <h2>Losses requested</h2>
      <ul style={{ color: "#333" }}>
        <li>Medical: {losses.wantsMedical ? "Yes" : "No"}</li>
        <li>Counseling: {losses.wantsCounseling ? "Yes" : "No"}</li>
        <li>Funeral: {losses.wantsFuneral ? "Yes" : "No"}</li>
        <li>Lost wages: {losses.wantsLostWages ? "Yes" : "No"}</li>
        <li>Relocation: {losses.wantsRelocation ? "Yes" : "No"}</li>
        <li>Property loss: {losses.wantsPropertyLoss ? "Yes" : "No"}</li>
        <li>Other: {losses.wantsOther ? `Yes (${losses.otherDescription ?? "—"})` : "No"}</li>
        <li>Estimated total: {losses.estimatedTotal ?? "—"}</li>
      </ul>

      <h2>Medical & counseling</h2>
      <ul style={{ color: "#333" }}>
        <li>Medical treatment: {formatYN(medical.hasMedicalTreatment)}</li>
        <li>Hospital: {medical.hospitalName ?? "—"}</li>
        <li>City: {medical.hospitalCity ?? "—"}</li>
        <li>Treatment dates: {medical.treatmentStart ?? "—"} to {medical.treatmentEnd ?? "—"}</li>
        <li>Counseling: {formatYN(medical.counseling?.hasCounseling)}</li>
        <li>Counseling provider: {medical.counseling?.providerName ?? "—"}</li>
        <li>Sessions: {medical.counseling?.sessionsCount ?? "—"}</li>
      </ul>

      <h2>Employment</h2>
      <ul style={{ color: "#333" }}>
        <li>Employed at time: {formatYN(employment.employedAtTime)}</li>
        <li>Employer: {employment.employerName ?? "—"}</li>
        <li>Missed work: {formatYN(employment.missedWork)}</li>
        <li>Dates missed: {employment.missedWorkFrom ?? "—"} to {employment.missedWorkTo ?? "—"}</li>
        <li>Disability from crime: {formatYN(employment.disabilityFromCrime)}</li>
      </ul>

      <h2>Funeral</h2>
      <ul style={{ color: "#333" }}>
        <li>Victim deceased: {formatYN(funeral.victimDeceased)}</li>
        <li>Funeral home: {funeral.funeralHomeName ?? "—"}</li>
        <li>Funeral phone: {funeral.funeralHomePhone ?? "—"}</li>
        <li>Dependents present: {formatYN(funeral.dependents?.hasDependents)}</li>
        <li>Dependent count: {funeral.dependents?.count ?? "—"}</li>
        <li>Dependent notes: {funeral.dependents?.notes ?? "—"}</li>
      </ul>

      <h2>Documents (uploads)</h2>
      <ul style={{ color: "#333" }}>
        <li>Police reports: {(uploads.policeReport?.length ?? 0)}</li>
        <li>Medical bills: {(uploads.medicalBills?.length ?? 0)}</li>
        <li>Counseling bills: {(uploads.counselingBills?.length ?? 0)}</li>
        <li>Funeral bills: {(uploads.funeralBills?.length ?? 0)}</li>
        <li>Wage proof: {(uploads.wageProof?.length ?? 0)}</li>
        <li>Other: {(uploads.other?.length ?? 0)}</li>
        <li>Notes: {documents.notes ?? "—"}</li>
      </ul>

      <hr style={{ margin: "18px 0" }} />

      <h2>Certification</h2>
      <p style={{ color: "#666" }}>
        This is not legal advice. This is a plain-language confirmation that the information is accurate to the best of your knowledge.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Full name (required)">
          <TextInput
            value={certFullName}
            onChange={(e) => setCertFullName(e.target.value)}
            placeholder="Type your full name"
          />
        </Field>

        <Field label="Date (required)">
          <TextInput
            value={certDate}
            onChange={(e) => setCertDate(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
        </Field>
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={certAgreeTruthful}
          onChange={(e) => setCertAgreeTruthful(e.target.checked)}
        />
        <span>I confirm the information provided is true and complete to the best of my knowledge.</span>
      </label>

      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={certAgreeRelease}
          onChange={(e) => setCertAgreeRelease(e.target.checked)}
        />
        <span>I understand supporting documents may be required and I may be asked for verification.</span>
      </label>
    </IntakeShell>
  );
}