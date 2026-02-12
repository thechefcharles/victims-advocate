// app/api/compensation/official-pdf/in/route.ts
// Indiana State Form 23776 – fill by drawing text at coordinates (no AcroForm fields).

import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import type { CompensationApplication } from "@/lib/compensationSchema";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { IN_CVC_COORDS } from "@/lib/pdfMaps/in_cvc_coords";

export const runtime = "nodejs";

type RequestBody =
  | { application: CompensationApplication }
  | { caseId: string };

function normalizeApplication(raw: unknown): CompensationApplication | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as CompensationApplication;
  if (typeof raw === "string") {
    try {
      const once = JSON.parse(raw.trim());
      if (typeof once === "object" && once) return once as CompensationApplication;
      if (typeof once === "string") {
        const twice = JSON.parse(once);
        if (typeof twice === "object" && twice) return twice as CompensationApplication;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    let appData: CompensationApplication | null = null;
    const body = (await req.json().catch(() => null)) as RequestBody | null;

    if (body && "application" in body && body.application) {
      appData = normalizeApplication(body.application);
    } else if (body && "caseId" in body && typeof body.caseId === "string") {
      const supabase = getSupabaseAdmin();
      const { data: caseRow, error } = await supabase
        .from("cases")
        .select("application")
        .eq("id", body.caseId)
        .single();
      if (error || !caseRow?.application) {
        return NextResponse.json({ error: "Case not found or no application data" }, { status: 404 });
      }
      const raw = caseRow.application;
      appData = typeof raw === "string" ? normalizeApplication(raw) : normalizeApplication(raw);
    }

    if (!appData) {
      return NextResponse.json({ error: "No application data provided" }, { status: 400 });
    }

    const templatePath = path.join(process.cwd(), "public", "pdf", "indiana_cvc_application.pdf");
    let templateBytes: Buffer;
    try {
      templateBytes = await readFile(templatePath);
    } catch {
      return NextResponse.json(
        { error: "Indiana CVC form not configured. Add public/pdf/indiana_cvc_application.pdf" },
        { status: 503 }
      );
    }

    const srcDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const pdfDoc = await PDFDocument.create();
    const pageCount = srcDoc.getPageCount();
    const pages = await pdfDoc.copyPages(srcDoc, Array.from({ length: pageCount }, (_, i) => i));
    pages.forEach((p) => pdfDoc.addPage(p));

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSizeDefault = 9;

    for (const item of IN_CVC_COORDS) {
      const text = item.getValue(appData);
      if (!text || !text.trim()) continue;
      const page = pdfDoc.getPage(item.pageIndex);
      const size = item.fontSize ?? fontSizeDefault;
      const maxWidth = 200;
      const lines = text.length > 60 ? [text.slice(0, 60), text.slice(60)].filter(Boolean) : [text];
      let y = item.y;
      for (const line of lines) {
        const safe = line.slice(0, 80);
        page.drawText(safe, {
          x: item.x,
          y,
          size,
          font,
        });
        y -= size + 2;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Indiana_CVC_Application_Filled.pdf"',
      },
    });
  } catch (err) {
    console.error("[IN PDF] Error generating official CVC PDF:", err);
    return NextResponse.json({ error: "Failed to generate Indiana CVC PDF" }, { status: 500 });
  }
}
