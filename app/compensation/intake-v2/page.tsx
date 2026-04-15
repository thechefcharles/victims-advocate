"use client";

/**
 * NxtStps Intake v2 — Template-driven intake renderer
 *
 * Architecture:
 * - Fields sourced from cvc_form_fields (DB) via
 *   GET /api/intake/template-fields
 * - Sections grouped by section_key, ordered by display_order
 * - Answers stored as flat Record<fieldKey, unknown> in
 *   intake_v2_sessions.answers
 * - Completion state computed client-side via
 *   lib/server/intakeV2/completionEngine (pure fn, importable from client)
 * - The certification section renders a custom summary view: per-section
 *   review + Edit links, the 3 certification inputs, auto-stamped
 *   signing date, Submit, and Download PDF.
 *
 * Runtime flow:
 *   Bootstrap → POST /api/intake-v2/sessions + GET /api/intake/template-fields
 *   Per-field edit → debounced PATCH /api/intake-v2/sessions/[id] (1 s)
 *   Final step → POST /api/intake-v2/sessions/[id]/submit
 *   Download → GET /api/intake-v2/sessions/[id]/download-pdf
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/components/i18n/i18nProvider";
import { FieldRenderer } from "@/components/intake-v2/FieldRenderer";
import { SectionProgress } from "@/components/intake-v2/SectionProgress";
import { ConditionalField } from "@/components/intake-v2/ConditionalField";
import { NxtGuideWidget } from "@/components/intake-v2/NxtGuideWidget";
import { evaluateConditional } from "@/components/intake-v2/conditionalEval";
import {
  computeIntakeCompletion,
  type SectionCompletion,
} from "@/lib/server/intakeV2/completionEngine";
import type {
  IntakeV2SessionView,
  RenderField,
  RenderSection,
  TemplateFields,
} from "@/components/intake-v2/types";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResp<T> = ApiOk<T> | ApiFail;

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const r = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await r.json().catch(() => null)) as ApiResp<T> | null;
  if (!body || !body.ok) {
    const code = body?.ok === false ? body.error.code : undefined;
    const message = body?.ok === false ? body.error.message : `HTTP ${r.status}`;
    const err = new Error(message) as Error & { code?: string; status?: number };
    err.code = code;
    err.status = r.status;
    throw err;
  }
  return body.data;
}

function errCode(e: unknown): string | undefined {
  if (e && typeof e === "object" && "code" in e) {
    return (e as { code?: unknown }).code as string | undefined;
  }
  return undefined;
}

const CERTIFICATION_SECTION_KEY = "certification";
const CERTIFICATION_FIELD_KEYS = [
  "cert_subrogation_acknowledged",
  "cert_release_authorized",
  "cert_typed_signature",
];

function formatAnswerForDisplay(field: RenderField, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "—";
  if (Array.isArray(value)) return value.length === 0 ? "—" : value.join(", ");
  if (typeof value === "string") {
    if (value.trim().length === 0) return "—";
    const opt = field.inputOptions?.find((o) => o.value === value);
    return opt?.label ?? value;
  }
  return String(value);
}

export default function IntakeV2Page() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = useI18n();
  const stateCode = params?.get("stateCode") ?? "IL";
  const filerType = params?.get("filerType") ?? "self_filing_adult";
  const urlSessionId = params?.get("sessionId") ?? null;
  const urlCaseId = params?.get("caseId") ?? null;

  const [template, setTemplate] = useState<TemplateFields | null>(null);
  const [session, setSession] = useState<IntakeV2SessionView | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [visitedSections, setVisitedSections] = useState<string[]>([]);
  const [bumpedSections, setBumpedSections] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ---- bootstrap: resume-or-create session + load template fields --------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fields = await api<TemplateFields>(
          `/api/intake/template-fields?stateCode=${encodeURIComponent(
            stateCode,
          )}&filerType=${encodeURIComponent(filerType)}`,
        );
        if (cancelled) return;
        setTemplate(fields);

        // Resolution order:
        //   1. ?sessionId= → GET that session; 404/403 falls through.
        //   2. ?caseId= → GET most-recent-draft for that case; 404 → POST
        //      create with caseId attached.
        //   3. Neither → POST create a fresh session.
        let resolved: IntakeV2SessionView | null = null;

        if (urlSessionId && !resolved) {
          try {
            resolved = await api<IntakeV2SessionView>(
              `/api/intake-v2/sessions/${urlSessionId}`,
            );
          } catch (e) {
            if (errCode(e) !== "NOT_FOUND" && errCode(e) !== "FORBIDDEN") throw e;
          }
        }

        if (urlCaseId && !resolved) {
          try {
            resolved = await api<IntakeV2SessionView>(
              `/api/intake-v2/sessions/by-case/${encodeURIComponent(urlCaseId)}`,
            );
          } catch (e) {
            if (errCode(e) !== "NOT_FOUND") throw e;
          }
        }

        if (!resolved) {
          const created = await api<{
            sessionId: string;
            templateId: string | null;
            stateCode: string;
            filerType: string;
          }>(`/api/intake-v2/sessions`, {
            method: "POST",
            body: JSON.stringify({
              stateCode,
              filerType,
              answersLocale: lang === "es" ? "es" : "en",
              caseId: urlCaseId ?? null,
            }),
          });
          if (cancelled) return;
          resolved = await api<IntakeV2SessionView>(
            `/api/intake-v2/sessions/${created.sessionId}`,
          );
        }

        if (cancelled || !resolved) return;
        setSession(resolved);

        // Restore navigation state for resumed sessions. `currentSection`
        // wins when set; otherwise land on the first section.
        const firstKey = fields.sections[0]?.sectionKey ?? null;
        const landingKey =
          resolved.currentSection &&
          fields.sections.some((s) => s.sectionKey === resolved.currentSection)
            ? resolved.currentSection
            : firstKey;
        setActiveSection(landingKey);
        // Treat every previously-completed section as visited so the tab
        // badges reflect true state on resume (no "first-load green ✓"
        // surprise for sections the user did earlier).
        const initialVisited = new Set<string>(resolved.completedSections);
        if (landingKey) initialVisited.add(landingKey);
        setVisitedSections(Array.from(initialVisited));
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stateCode, filerType, lang, urlSessionId, urlCaseId]);

  // Track visited sections as the user navigates.
  useEffect(() => {
    if (!activeSection) return;
    setVisitedSections((prev) => (prev.includes(activeSection) ? prev : [...prev, activeSection]));
  }, [activeSection]);

  // ---- debounced PATCH (1s) ------------------------------------------------
  const pendingRef = useRef<Record<string, unknown>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (!session) return;
    const payload = pendingRef.current;
    if (Object.keys(payload).length === 0) return;
    pendingRef.current = {};
    try {
      const updated = await api<IntakeV2SessionView>(
        `/api/intake-v2/sessions/${session.sessionId}`,
        { method: "PATCH", body: JSON.stringify({ answers: payload }) },
      );
      setSession(updated);
    } catch (e) {
      setError(`Save failed: ${(e as Error).message}`);
    }
  }, [session]);

  const setFieldValue = useCallback(
    (fieldKey: string, value: unknown) => {
      setSession((prev) =>
        prev ? { ...prev, answers: { ...prev.answers, [fieldKey]: value } } : prev,
      );
      pendingRef.current[fieldKey] = value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, 1000);
    },
    [flush],
  );

  const onFieldBlur = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void flush();
  }, [flush]);

  // ---- completion ---------------------------------------------------------
  const sections = template?.sections ?? [];
  const answers = session?.answers ?? {};
  const completion = useMemo(
    () => computeIntakeCompletion(sections, answers),
    [sections, answers],
  );
  const completionBySection = useMemo(() => {
    const map: Record<string, SectionCompletion> = {};
    for (const s of completion.sections) map[s.sectionKey] = s;
    return map;
  }, [completion]);

  // ---- navigation ---------------------------------------------------------
  const currentSection = useMemo(
    () => sections.find((s) => s.sectionKey === activeSection) ?? null,
    [sections, activeSection],
  );
  const sectionIndex = useMemo(
    () =>
      currentSection
        ? sections.findIndex((s) => s.sectionKey === currentSection.sectionKey)
        : -1,
    [sections, currentSection],
  );
  const isCertificationActive =
    currentSection?.sectionKey === CERTIFICATION_SECTION_KEY;
  const isLast = sectionIndex >= 0 && sectionIndex === sections.length - 1;

  async function goNext() {
    if (!currentSection || !session) return;
    const sectionStatus = completionBySection[currentSection.sectionKey];
    if (sectionStatus && !sectionStatus.isComplete) {
      setBumpedSections((prev) => {
        const next = new Set(prev);
        next.add(currentSection.sectionKey);
        return next;
      });
      return;
    }
    await flush();
    try {
      const updated = await api<IntakeV2SessionView>(
        `/api/intake-v2/sessions/${session.sessionId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            completedSections: [currentSection.sectionKey],
            currentSection:
              sections[sectionIndex + 1]?.sectionKey ?? currentSection.sectionKey,
          }),
        },
      );
      setSession(updated);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    if (!isLast) setActiveSection(sections[sectionIndex + 1].sectionKey);
  }

  function goPrev() {
    if (sectionIndex > 0) setActiveSection(sections[sectionIndex - 1].sectionKey);
  }

  function jumpTo(sectionKey: string) {
    setActiveSection(sectionKey);
  }

  async function submit() {
    if (!session) return;
    if (!completion.isReadyToSubmit) return;
    if (!session.signedAt) return;
    setSubmitting(true);
    setError(null);
    try {
      await flush();
      await api(`/api/intake-v2/sessions/${session.sessionId}/submit`, { method: "POST" });
      router.push("/compensation");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function download() {
    if (!session) return;
    setDownloading(true);
    setError(null);
    try {
      await flush();
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      const r = await fetch(
        `/api/intake-v2/sessions/${session.sessionId}/download-pdf`,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
      );
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.error?.message ?? `HTTP ${r.status}`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "il-cvc-application.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  // ---- render --------------------------------------------------------------
  if (error && !template) {
    const is404 = /not\s*found|404/i.test(error);
    return (
      <main className="mx-auto max-w-3xl space-y-3 p-6 text-sm">
        <h1 className="text-lg font-semibold text-gray-900">Compensation Intake</h1>
        <p className="rounded-md bg-red-50 px-3 py-2 text-red-800">Error: {error}</p>
        {is404 && (
          <p className="text-gray-600">
            No active CVC template is seeded for state <code>{stateCode}</code>. Run the
            seed script (<code>npx tsx scripts/seed-cvc-form-templates.ts</code>) and
            activate the template, then reload.
          </p>
        )}
      </main>
    );
  }
  if (!template || !session || !currentSection) {
    return <main className="mx-auto max-w-3xl p-6 text-sm text-gray-600">Loading…</main>;
  }

  const bumped = bumpedSections.has(currentSection.sectionKey);
  const sectionStatus = completionBySection[currentSection.sectionKey];
  const missing = sectionStatus?.missingFields ?? [];
  const shouldShowMissingPanel = bumped && missing.length > 0;
  const fieldsForSection = currentSection.fields ?? [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {template.stateCode} · {filerType}
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">Compensation Intake</h1>
        <p className="text-xs text-gray-500">
          {completion.totalFilledRequired} of {completion.totalRequired} required fields
          complete · {completion.percentComplete}%
        </p>
      </header>

      <SectionProgress
        sections={sections}
        activeKey={currentSection.sectionKey}
        visitedKeys={visitedSections}
        completionBySection={completionBySection}
        onSelect={jumpTo}
      />

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-gray-900">{currentSection.sectionTitle}</h2>

        {shouldShowMissingPanel && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            <p className="font-medium">Required fields missing:</p>
            <ul className="mt-1 list-disc pl-5">
              {missing.map((m) => (
                <li key={m.fieldKey}>{m.label}</li>
              ))}
            </ul>
          </div>
        )}

        {isCertificationActive ? (
          <CertificationView
            template={template}
            completion={completion}
            session={session}
            sectionFields={fieldsForSection}
            onJumpTo={jumpTo}
            setFieldValue={setFieldValue}
            onFieldBlur={onFieldBlur}
            submitting={submitting}
            downloading={downloading}
            onSubmit={submit}
            onDownload={download}
          />
        ) : (
          <>
            {fieldsForSection.length === 0 && (
              <p className="text-sm text-gray-500">No fields configured for this section yet.</p>
            )}
            <div className="space-y-4">
              {fieldsForSection.map((field) => (
                <ConditionalField
                  key={field.fieldKey}
                  rule={field.conditionalOn}
                  answers={session.answers}
                >
                  <FieldRenderer
                    field={field}
                    value={session.answers[field.fieldKey]}
                    onChange={(v) => setFieldValue(field.fieldKey, v)}
                    onBlur={onFieldBlur}
                  />
                </ConditionalField>
              ))}
            </div>
          </>
        )}
      </section>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {!isCertificationActive && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            disabled={sectionIndex <= 0}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Next
          </button>
        </div>
      )}

      <NxtGuideWidget
        currentSectionKey={currentSection.sectionKey}
        stateCode={template.stateCode}
      />
    </main>
  );
}

// -----------------------------------------------------------------------------
// Certification / Summary view
// -----------------------------------------------------------------------------

interface CertificationViewProps {
  template: TemplateFields;
  completion: ReturnType<typeof computeIntakeCompletion>;
  session: IntakeV2SessionView;
  sectionFields: RenderField[];
  onJumpTo: (sectionKey: string) => void;
  setFieldValue: (fieldKey: string, value: unknown) => void;
  onFieldBlur: () => void;
  submitting: boolean;
  downloading: boolean;
  onSubmit: () => void;
  onDownload: () => void;
}

function CertificationView(props: CertificationViewProps) {
  const {
    template,
    completion,
    session,
    sectionFields,
    onJumpTo,
    setFieldValue,
    onFieldBlur,
    submitting,
    downloading,
    onSubmit,
    onDownload,
  } = props;

  const certFields = sectionFields.filter((f) => CERTIFICATION_FIELD_KEYS.includes(f.fieldKey));
  const reviewSections = completion.sections.filter(
    (s) => s.sectionKey !== CERTIFICATION_SECTION_KEY,
  );
  const templateSectionByKey = Object.fromEntries(
    template.sections.map((s) => [s.sectionKey, s]),
  );

  const subrogationChecked = session.answers.cert_subrogation_acknowledged === true;
  const releaseChecked = session.answers.cert_release_authorized === true;
  const typedSig =
    typeof session.answers.cert_typed_signature === "string"
      ? session.answers.cert_typed_signature
      : "";
  const certComplete =
    subrogationChecked && releaseChecked && typedSig.trim().length > 0;
  const canSubmit = completion.isReadyToSubmit && certComplete;

  const signedDate = session.signedAt ? new Date(session.signedAt) : new Date();
  const signedDateLabel = `${String(signedDate.getMonth() + 1).padStart(2, "0")}/${String(signedDate.getDate()).padStart(2, "0")}/${signedDate.getFullYear()}`;

  return (
    <div className="space-y-6">
      {/* Per-section review */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Review your answers
        </h3>
        {reviewSections.map((sec) => {
          const tmplSec = templateSectionByKey[sec.sectionKey];
          if (!tmplSec) return null;
          return (
            <SectionReviewCard
              key={sec.sectionKey}
              section={tmplSec}
              status={sec}
              answers={session.answers}
              onEdit={() => onJumpTo(sec.sectionKey)}
            />
          );
        })}
      </div>

      {/* Certification inputs */}
      <div className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Certification
        </h3>
        {certFields.map((field) => (
          <FieldRenderer
            key={field.fieldKey}
            field={field}
            value={session.answers[field.fieldKey]}
            onChange={(v) => setFieldValue(field.fieldKey, v)}
            onBlur={onFieldBlur}
          />
        ))}
        <div className="text-sm text-gray-700">
          <span className="font-medium">Date Signed: </span>
          <span>{session.signedAt ? signedDateLabel : "Will be stamped when you complete the three items above."}</span>
        </div>
      </div>

      {/* Submit + Download */}
      <div className="space-y-3">
        {!canSubmit && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {!completion.isReadyToSubmit
              ? "Please complete all required fields in the sections above before submitting."
              : "Please complete the three certification items above before submitting."}
          </p>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || submitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300 disabled:text-gray-500"
        >
          {submitting ? "Submitting…" : "Submit Application"}
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="w-full rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
        >
          {downloading ? "Preparing PDF…" : "Download PDF (preview)"}
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

interface SectionReviewCardProps {
  section: RenderSection;
  status: SectionCompletion;
  answers: Record<string, unknown>;
  onEdit: () => void;
}

function SectionReviewCard({ section, status, answers, onEdit }: SectionReviewCardProps) {
  const visibleFields = section.fields.filter((f) =>
    evaluateConditional(f.conditionalOn, answers),
  );
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900">{section.sectionTitle}</h4>
          {status.isComplete ? (
            <span className="rounded-full border border-green-600 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-800">
              Complete
            </span>
          ) : status.missingFields.length > 0 ? (
            <span className="rounded-full border border-red-500 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-800">
              {status.missingFields.length} required missing
            </span>
          ) : (
            <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-700">
              Optional
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-blue-700 hover:underline"
        >
          Edit
        </button>
      </div>
      {visibleFields.length === 0 ? (
        <p className="text-xs text-gray-500">No fields in this section.</p>
      ) : (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
          {visibleFields.map((f) => (
            <div key={f.fieldKey} className="contents">
              <dt className="truncate text-xs text-gray-500">{f.label}</dt>
              <dd className="text-gray-900">{formatAnswerForDisplay(f, answers[f.fieldKey])}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
