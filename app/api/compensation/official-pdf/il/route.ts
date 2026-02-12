// app/api/compensation/official-pdf/il/route.ts
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import type { CompensationApplication } from "@/lib/compensationSchema";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { IL_CVC_FIELD_MAP } from "@/lib/pdfMaps/il_cvc_fieldMap";

export const runtime = "nodejs";

type RequestBody = { application: CompensationApplication } | { caseId: string };

function normalizeApplication(raw: any): CompensationApplication | null {
  // raw can be:
  // - object (ideal)
  // - JSON string
  // - double-encoded JSON string
  if (!raw) return null;

  if (typeof raw === "object") return raw as CompensationApplication;

  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      const once = JSON.parse(s);
      if (typeof once === "object" && once) return once as CompensationApplication;

      if (typeof once === "string") {
        const twice = JSON.parse(once);
        if (typeof twice === "object" && twice) return twice as CompensationApplication;
        return null;
      }

      return null;
    } catch {
      return null;
    }
  }

  return null;
}

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

  const data: any = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

/**
 * Translate text fields from Spanish to English, preserving names/addresses/numbers
 */
async function translateTextFieldsIfNeeded(
  app: CompensationApplication
): Promise<CompensationApplication> {
  const prefersEnglish = app?.contact?.prefersEnglish ?? true;
  const preferredLanguage = (app?.contact?.preferredLanguage ?? "").toLowerCase();

  const shouldTranslate =
    !prefersEnglish && (preferredLanguage === "spanish" || preferredLanguage === "es");

  if (!shouldTranslate) return app;

  // Deep clone to avoid mutating original
  const out: CompensationApplication =
    typeof structuredClone === "function"
      ? structuredClone(app)
      : (JSON.parse(JSON.stringify(app)) as CompensationApplication);

  // Translate crime narratives
  if (typeof out.crime?.crimeDescription === "string" && out.crime.crimeDescription.trim()) {
    out.crime.crimeDescription = await translateToEnglishOpenAI(out.crime.crimeDescription);
  }
  if (typeof out.crime?.injuryDescription === "string" && out.crime.injuryDescription.trim()) {
    out.crime.injuryDescription = await translateToEnglishOpenAI(out.crime.injuryDescription);
  }
  if (typeof out.crime?.offenderRelationship === "string" && out.crime.offenderRelationship.trim()) {
    out.crime.offenderRelationship = await translateToEnglishOpenAI(out.crime.offenderRelationship);
  }

  // Translate applicant relationship
  if (
    typeof out.applicant?.relationshipToVictim === "string" &&
    out.applicant.relationshipToVictim.trim() &&
    out.applicant.relationshipToVictim !== "Self"
  ) {
    out.applicant.relationshipToVictim = await translateToEnglishOpenAI(
      out.applicant.relationshipToVictim
    );
  }

  // Translate alternate contact relationship
  if (
    typeof out.contact?.alternateContactRelationship === "string" &&
    out.contact.alternateContactRelationship.trim()
  ) {
    out.contact.alternateContactRelationship = await translateToEnglishOpenAI(
      out.contact.alternateContactRelationship
    );
  }

  // Translate medical insurance descriptions
  if (
    typeof out.medical?.otherInsuranceDescription === "string" &&
    out.medical.otherInsuranceDescription.trim()
  ) {
    out.medical.otherInsuranceDescription = await translateToEnglishOpenAI(
      out.medical.otherInsuranceDescription
    );
  }

  // Translate employment benefit notes
  if (
    typeof out.employment?.benefitNotes === "string" &&
    out.employment.benefitNotes.trim()
  ) {
    out.employment.benefitNotes = await translateToEnglishOpenAI(out.employment.benefitNotes);
  }

  // Translate funeral payer relationships
  if (out.funeral?.payments) {
    for (const payment of out.funeral.payments) {
      if (
        typeof payment.relationshipToVictim === "string" &&
        payment.relationshipToVictim.trim()
      ) {
        payment.relationshipToVictim = await translateToEnglishOpenAI(
          payment.relationshipToVictim
        );
      }
    }
  }

  // Translate dependent relationships
  if (out.funeral?.dependents) {
    for (const dependent of out.funeral.dependents) {
      if (
        typeof dependent.relationshipToVictim === "string" &&
        dependent.relationshipToVictim.trim()
      ) {
        dependent.relationshipToVictim = await translateToEnglishOpenAI(
          dependent.relationshipToVictim
        );
      }
    }
  }

  // Translate court case outcomes
  if (
    typeof out.court?.criminalCaseOutcome === "string" &&
    out.court.criminalCaseOutcome.trim()
  ) {
    out.court.criminalCaseOutcome = await translateToEnglishOpenAI(
      out.court.criminalCaseOutcome
    );
  }
  if (
    typeof out.court?.humanTraffickingCaseOutcome === "string" &&
    out.court.humanTraffickingCaseOutcome.trim()
  ) {
    out.court.humanTraffickingCaseOutcome = await translateToEnglishOpenAI(
      out.court.humanTraffickingCaseOutcome
    );
  }

  // Translate protection/civil descriptions
  if (
    typeof out.protectionAndCivil?.useOfForceProceedingsDescription === "string" &&
    out.protectionAndCivil.useOfForceProceedingsDescription.trim()
  ) {
    out.protectionAndCivil.useOfForceProceedingsDescription = await translateToEnglishOpenAI(
      out.protectionAndCivil.useOfForceProceedingsDescription
    );
  }
  if (
    typeof out.protectionAndCivil?.supplementalDocsDescription === "string" &&
    out.protectionAndCivil.supplementalDocsDescription.trim()
  ) {
    out.protectionAndCivil.supplementalDocsDescription = await translateToEnglishOpenAI(
      out.protectionAndCivil.supplementalDocsDescription
    );
  }

  return out;
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const body = (await req.json()) as RequestBody;

    let appData: CompensationApplication | null = null;

    // Option 1: direct application from intake
    if ("application" in body) {
      appData = body.application;
    }

    // Option 2: caseId → load from Supabase
    if (!appData && "caseId" in body) {
      const { data, error } = await supabaseAdmin
        .from("cases")
        .select("application")
        .eq("id", body.caseId)
        .single();

      if (error || !data?.application) {
        console.error("[IL PDF] Failed to load application for case", body.caseId, error);
        return NextResponse.json({ error: "Could not load case application" }, { status: 404 });
      }

      const normalized = normalizeApplication(data.application);
      if (!normalized) {
        console.error("[IL PDF] application column is not valid JSON (or is double-encoded)");
        return NextResponse.json(
          { error: "Case application is not valid JSON" },
          { status: 500 }
        );
      }

      appData = normalized;
    }

    if (!appData) {
      return NextResponse.json({ error: "No application data provided" }, { status: 400 });
    }

    // ✅ Translate all text fields from Spanish to English for IL PDF if Spanish intake
    appData = await translateTextFieldsIfNeeded(appData);

    // 1) Load the IL CVC PDF template from /public/pdf
    const templatePath = path.join(process.cwd(), "public", "pdf", "il_cvc_application.pdf");
    const templateBytes = await readFile(templatePath);

    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    // Log all field names and types for debugging/field map verification
    // This helps identify the actual PDF field names when building the field map
    if (process.env.NODE_ENV === "development") {
      const fields = form.getFields();
      console.log(`[IL PDF] Found ${fields.length} form fields:`);
      const fieldTypes: Record<string, number> = {};
      fields.forEach((f) => {
        const name = f.getName();
        const type = (f as any)?.constructor?.name ?? "Unknown";
        fieldTypes[type] = (fieldTypes[type] || 0) + 1;
        console.log(`  - ${name} (${type})`);
      });
      console.log(`[IL PDF] Field type summary:`, fieldTypes);
    }

    // 2) Fill mapped fields (text fields and checkboxes)
    for (const [fieldName, getter] of Object.entries(IL_CVC_FIELD_MAP)) {
      const value = getter(appData);
      
      // Skip undefined/null/empty string values
      if (value === undefined || value === null || value === "") continue;

      try {
        // Check if value is boolean (for checkboxes)
        if (typeof value === "boolean") {
          try {
            const checkbox = form.getCheckBox(fieldName);
            if (value === true) {
              checkbox.check();
            } else {
              checkbox.uncheck();
            }
            continue;
          } catch {
            // Not a checkbox field, try as text field
          }
        }

        // Try as text field
        try {
          const field = form.getTextField(fieldName);
          // Convert value to string if needed
          const textValue = typeof value === "string" ? value : String(value);
          if (textValue.trim()) {
            field.setText(textValue);
          }
        } catch {
          // Field doesn't exist or is different type - skip silently
          // (Many fields may not exist in the PDF, which is fine)
          if (process.env.NODE_ENV === "development") {
            console.warn(`[IL PDF] Field "${fieldName}" not found or unsupported type`);
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[IL PDF] Error filling field "${fieldName}":`, err);
        }
      }
    }

    form.updateFieldAppearances();

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Illinois_CVC_Application_Filled.pdf"',
      },
    });
  } catch (err) {
    console.error("[IL PDF] Error generating official CVC PDF:", err);
    return NextResponse.json({ error: "Failed to generate IL CVC PDF" }, { status: 500 });
  }
}