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

async function translateIlNarrativesIfNeeded(
  app: CompensationApplication
): Promise<CompensationApplication> {
  const prefersEnglish = app?.contact?.prefersEnglish ?? true;
  const preferredLanguage = (app?.contact?.preferredLanguage ?? "").toLowerCase();

  const shouldTranslate =
    !prefersEnglish && (preferredLanguage === "spanish" || preferredLanguage === "es");

  if (!shouldTranslate) return app;

  // Node.js runtime: structuredClone is available in modern Node; fallback included.
  const out: CompensationApplication =
    typeof structuredClone === "function"
      ? structuredClone(app)
      : (JSON.parse(JSON.stringify(app)) as CompensationApplication);

  const crimeDesc = out?.crime?.crimeDescription;
  const injuryDesc = out?.crime?.injuryDescription;

  // MVP: translate ONLY narratives (avoid names/addresses/etc.)
  if (typeof crimeDesc === "string" && crimeDesc.trim()) {
    out.crime.crimeDescription = await translateToEnglishOpenAI(crimeDesc);
  }
  if (typeof injuryDesc === "string" && injuryDesc.trim()) {
    out.crime.injuryDescription = await translateToEnglishOpenAI(injuryDesc);
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

    // ✅ Translate narratives into English for IL PDF if Spanish intake
    appData = await translateIlNarrativesIfNeeded(appData);

    // 1) Load the IL CVC PDF template from /public/pdf
    const templatePath = path.join(process.cwd(), "public", "pdf", "il_cvc_application.pdf");
    const templateBytes = await readFile(templatePath);

    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    // (Optional) TEMP: log all field names so we can build/verify field map
    const fields = form.getFields();
    console.log("IL CVC form fields:");
    fields.forEach((f) => {
      const name = f.getName();
      const type = (f as any)?.constructor?.name ?? "Unknown";
      console.log(`- ${name} (${type})`);
    });

    // 2) Fill mapped text fields
    for (const [fieldName, getter] of Object.entries(IL_CVC_FIELD_MAP)) {
      const value = getter(appData);
      if (!value) continue;

      try {
        const field = form.getTextField(fieldName);
        field.setText(value);
      } catch {
        // skip missing fields
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