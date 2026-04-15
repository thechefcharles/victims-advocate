/**
 * Domain 2.3 — CVC Form Processing: PDF rendering service.
 *
 * The core rendering engine. Uses pdf-lib (already in package.json).
 * NO route logic. NO auth checks (those happen in cvcOutputService before call).
 *
 * IL: AcroForm fill via IL_CVC_FIELD_MAP, with OpenAI Spanish→English
 *     pre-translation of narrative fields (preserved from the legacy route).
 * IN: coordinate-based draw via IN_CVC_COORDS.
 *
 * The translation step is preserved exactly from the legacy
 * app/api/compensation/official-pdf/il/route.ts implementation —
 * same OpenAI model env var, same prompt, same fields translated.
 */

import { PDFDocument, StandardFonts } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import type { LegacyIntakePayload } from "@/lib/archive/compensationSchema.legacy";
import { IL_CVC_FIELD_MAP } from "@/lib/pdfMaps/il_cvc_fieldMap";
import { IN_CVC_COORDS } from "@/lib/pdfMaps/in_cvc_coords";

// ---------------------------------------------------------------------------
// OpenAI translation (preserved from legacy IL route)
// ---------------------------------------------------------------------------

async function translateToEnglishOpenAI(input: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const system = [
    "You are a translation engine for sensitive legal intake content.",
    "Translate the user-provided text into English.",
    "Preserve formatting, punctuation, and line breaks.",
    "Do not add commentary. Output ONLY the translated text.",
    "Do not translate names, addresses, emails, phone numbers, IDs, or case numbers if present.",
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
    }),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new Error(`OpenAI translate failed: ${details}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

/**
 * Translate narrative text fields from Spanish to English when the applicant
 * preferred Spanish. Behavior copied verbatim from the legacy IL route.
 */
export async function translateNarrativeFieldsForOutput(
  app: LegacyIntakePayload,
): Promise<LegacyIntakePayload> {
  const prefersEnglish = app?.contact?.prefersEnglish ?? true;
  const preferredLanguage = (app?.contact?.preferredLanguage ?? "").toLowerCase();
  const shouldTranslate =
    !prefersEnglish && (preferredLanguage === "spanish" || preferredLanguage === "es");
  if (!shouldTranslate) return app;

  const out: LegacyIntakePayload =
    typeof structuredClone === "function"
      ? structuredClone(app)
      : (JSON.parse(JSON.stringify(app)) as LegacyIntakePayload);

  if (typeof out.crime?.crimeDescription === "string" && out.crime.crimeDescription.trim()) {
    out.crime.crimeDescription = await translateToEnglishOpenAI(out.crime.crimeDescription);
  }
  if (typeof out.crime?.injuryDescription === "string" && out.crime.injuryDescription.trim()) {
    out.crime.injuryDescription = await translateToEnglishOpenAI(out.crime.injuryDescription);
  }
  if (typeof out.crime?.offenderRelationship === "string" && out.crime.offenderRelationship.trim()) {
    out.crime.offenderRelationship = await translateToEnglishOpenAI(out.crime.offenderRelationship);
  }
  if (
    typeof out.applicant?.relationshipToVictim === "string" &&
    out.applicant.relationshipToVictim.trim() &&
    out.applicant.relationshipToVictim !== "Self"
  ) {
    out.applicant.relationshipToVictim = await translateToEnglishOpenAI(
      out.applicant.relationshipToVictim,
    );
  }
  if (
    typeof out.contact?.alternateContactRelationship === "string" &&
    out.contact.alternateContactRelationship.trim()
  ) {
    out.contact.alternateContactRelationship = await translateToEnglishOpenAI(
      out.contact.alternateContactRelationship,
    );
  }
  if (
    typeof out.medical?.otherInsuranceDescription === "string" &&
    out.medical.otherInsuranceDescription.trim()
  ) {
    out.medical.otherInsuranceDescription = await translateToEnglishOpenAI(
      out.medical.otherInsuranceDescription,
    );
  }
  if (typeof out.employment?.benefitNotes === "string" && out.employment.benefitNotes.trim()) {
    out.employment.benefitNotes = await translateToEnglishOpenAI(out.employment.benefitNotes);
  }
  if (out.funeral?.payments) {
    for (const payment of out.funeral.payments) {
      if (
        typeof payment.relationshipToVictim === "string" &&
        payment.relationshipToVictim.trim()
      ) {
        payment.relationshipToVictim = await translateToEnglishOpenAI(
          payment.relationshipToVictim,
        );
      }
    }
  }
  if (out.funeral?.dependents) {
    for (const dependent of out.funeral.dependents) {
      if (
        typeof dependent.relationshipToVictim === "string" &&
        dependent.relationshipToVictim.trim()
      ) {
        dependent.relationshipToVictim = await translateToEnglishOpenAI(
          dependent.relationshipToVictim,
        );
      }
    }
  }
  if (
    typeof out.court?.criminalCaseOutcome === "string" &&
    out.court.criminalCaseOutcome.trim()
  ) {
    out.court.criminalCaseOutcome = await translateToEnglishOpenAI(out.court.criminalCaseOutcome);
  }
  if (
    typeof out.court?.humanTraffickingCaseOutcome === "string" &&
    out.court.humanTraffickingCaseOutcome.trim()
  ) {
    out.court.humanTraffickingCaseOutcome = await translateToEnglishOpenAI(
      out.court.humanTraffickingCaseOutcome,
    );
  }
  if (
    typeof out.protectionAndCivil?.useOfForceProceedingsDescription === "string" &&
    out.protectionAndCivil.useOfForceProceedingsDescription.trim()
  ) {
    out.protectionAndCivil.useOfForceProceedingsDescription = await translateToEnglishOpenAI(
      out.protectionAndCivil.useOfForceProceedingsDescription,
    );
  }
  if (
    typeof out.protectionAndCivil?.supplementalDocsDescription === "string" &&
    out.protectionAndCivil.supplementalDocsDescription.trim()
  ) {
    out.protectionAndCivil.supplementalDocsDescription = await translateToEnglishOpenAI(
      out.protectionAndCivil.supplementalDocsDescription,
    );
  }

  return out;
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

async function renderIlPdf(app: LegacyIntakePayload): Promise<Uint8Array> {
  // 1) Translate narrative fields (preserved from legacy route)
  const translatedApp = await translateNarrativeFieldsForOutput(app);

  // 2) Load the IL CVC PDF template from /public/pdf
  const templatePath = path.join(process.cwd(), "public", "pdf", "il_cvc_application.pdf");
  const templateBytes = await readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  // 3) Fill mapped fields (text fields and checkboxes) — same logic as legacy route
  for (const [fieldName, getter] of Object.entries(IL_CVC_FIELD_MAP)) {
    const value = getter(translatedApp);
    if (value === undefined || value === null || value === "") continue;
    try {
      if (typeof value === "boolean") {
        try {
          const checkbox = form.getCheckBox(fieldName);
          if (value === true) checkbox.check();
          else checkbox.uncheck();
          continue;
        } catch {
          // Not a checkbox — fall through to text attempt
        }
      }
      try {
        const field = form.getTextField(fieldName);
        const textValue = typeof value === "string" ? value : String(value);
        if (textValue.trim()) field.setText(textValue);
      } catch {
        // Field doesn't exist or is different type — skip silently
      }
    } catch {
      // Tolerate field-level errors; never fail the whole render for a single field
    }
  }

  form.updateFieldAppearances();
  return pdfDoc.save();
}

async function renderInPdf(app: LegacyIntakePayload): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "public", "pdf", "indiana_cvc_application.pdf");
  const templateBytes = await readFile(templatePath);

  const srcDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const pdfDoc = await PDFDocument.create();
  const pageCount = srcDoc.getPageCount();
  const pages = await pdfDoc.copyPages(
    srcDoc,
    Array.from({ length: pageCount }, (_, i) => i),
  );
  pages.forEach((p) => pdfDoc.addPage(p));

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSizeDefault = 9;

  for (const item of IN_CVC_COORDS) {
    const value = item.getValue(app);
    if (!value) continue;
    const page = pdfDoc.getPage(item.pageIndex);
    page.drawText(value, {
      x: item.x,
      y: item.y,
      size: item.fontSize ?? fontSizeDefault,
      font,
    });
  }

  return pdfDoc.save();
}

/**
 * Renders a CVC PDF for the given template id and application data.
 *
 * @param templateId — 'il_cvc' or 'in_cvc'
 * @param application — the resolved LegacyIntakePayload payload
 * @returns PDF bytes
 */
export async function renderCvcPdf(
  templateId: string,
  application: LegacyIntakePayload,
): Promise<Uint8Array> {
  if (templateId === "il_cvc") return renderIlPdf(application);
  if (templateId === "in_cvc") return renderInPdf(application);
  throw new Error(`renderCvcPdf: unsupported template_id "${templateId}"`);
}
