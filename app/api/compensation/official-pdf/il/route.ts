// app/api/compensation/official-pdf/il/route.ts
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import type { CompensationApplication } from "@/lib/compensationSchema";
import { supabaseServer } from "@/lib/supabaseServer";
import { IL_CVC_FIELD_MAP } from "@/lib/pdfMaps/il_cvc_fieldMap";

export const runtime = "nodejs";

type RequestBody =
  | { application: CompensationApplication }
  | { caseId: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    let appData: CompensationApplication | null = null;

    // Option 1: direct application from intake
    if ("application" in body) {
      appData = body.application;
    }

    // Option 2: caseId → load from Supabase
    if (!appData && "caseId" in body) {
      const { data, error } = await supabaseServer
        .from("cases")
        .select("application")
        .eq("id", body.caseId)
        .single();

      if (error || !data?.application) {
        console.error(
          "[IL PDF] Failed to load application for case",
          body.caseId,
          error
        );
        return NextResponse.json(
          { error: "Could not load case application" },
          { status: 404 }
        );
      }

      appData = data.application as CompensationApplication;
    }

    if (!appData) {
      return NextResponse.json(
        { error: "No application data provided" },
        { status: 400 }
      );
    }

    // 1) Load the IL CVC PDF template from /public/pdf
    const templatePath = path.join(
      process.cwd(),
      "public",
      "pdf",
      "il_cvc_application.pdf"
    );
    const templateBytes = await readFile(templatePath);

    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    // 🔍 TEMP: log all field names so we can build IL_CVC_FIELD_MAP later
    const fields = form.getFields();
    console.log("IL CVC form fields:");
    fields.forEach((f) => {
      const name = f.getName();
      const type = f.constructor.name;
      console.log(`- ${name} (${type})`);
    });

// 2) Fill mapped text fields
for (const [fieldName, getter] of Object.entries(IL_CVC_FIELD_MAP)) {
  const value = getter(appData);
  if (!value) continue; // skip empty

  try {
    const field = form.getTextField(fieldName);
    field.setText(value);
  } catch {
    // If field name doesn't exist in the PDF, just skip it
    // console.warn(`[IL PDF] Text field "${fieldName}" not found in form`);
  }
}

// Optional: update appearances & flatten
form.updateFieldAppearances();
const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="Illinois_CVC_Application_Filled.pdf"',
      },
    });
  } catch (err) {
    console.error("[IL PDF] Error generating official CVC PDF:", err);
    return NextResponse.json(
      { error: "Failed to generate IL CVC PDF" },
      { status: 500 }
    );
  }
}