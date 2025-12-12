import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const POST = async (req: Request) => {
  try {
    const body = await req.json();

    const {
      victim,
      applicant,
      crime,
      losses,
      medical,
      employment,
      funeral,
      certification,
    } = body as any; // We trust the front-end type here; you can tighten later

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    let y = height - margin;

    const drawText = (text: string, opts: { bold?: boolean } = {}) => {
      const lineHeight = 14;
      const maxWidth = width - margin * 2;

      const chunks = wrapText(text, 90); // crude wrap for now
      chunks.forEach((chunk) => {
        page.drawText(chunk, {
          x: margin,
          y,
          size: 10,
          font: opts.bold ? fontBold : font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= lineHeight;
      });
      y -= 6; // extra spacing between blocks
    };

    // Header
    page.drawText("NxtStps – IL Crime Victims Compensation Summary", {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 24;

    // Victim
    drawText("Victim", { bold: true });
    drawText(
      `Name: ${victim?.firstName ?? ""} ${victim?.lastName ?? ""}`.trim()
    );
    drawText(
      `DOB: ${victim?.dateOfBirth || "—"} | Phone: ${victim?.cellPhone || "—"}`
    );
    drawText(
      `Address: ${victim?.streetAddress || ""}${
        victim?.apt ? ", " + victim.apt : ""
      }, ${victim?.city || ""}, ${victim?.state || ""} ${victim?.zip || ""}`
    );

    // Applicant
    drawText("Applicant", { bold: true });
    if (applicant?.isSameAsVictim) {
      drawText("Victim and applicant are the same person.");
    } else {
      drawText(
        `Name: ${applicant?.firstName ?? ""} ${
          applicant?.lastName ?? ""
        }`.trim()
      );
      drawText(
        `Relationship: ${
          applicant?.relationshipToVictim || "Not provided"
        } | Phone: ${applicant?.cellPhone || "—"}`
      );
    }

    // Crime snapshot
    drawText("Crime snapshot", { bold: true });
    drawText(`Date of crime: ${crime?.dateOfCrime || "—"}`);
    drawText(
      `Location: ${crime?.crimeAddress || "—"}, ${crime?.crimeCity || ""}${
        crime?.crimeCounty ? " (" + crime.crimeCounty + ")" : ""
      }`
    );
    drawText(
      `Reported to: ${crime?.reportingAgency || "—"} | Police report #: ${
        crime?.policeReportNumber || "—"
      }`
    );
    if (crime?.crimeDescription) {
      drawText(`Description: ${crime.crimeDescription}`);
    }
    if (crime?.injuryDescription) {
      drawText(`Injuries: ${crime.injuryDescription}`);
    }

    // Losses
    drawText("Losses claimed", { bold: true });
    const selectedLosses = Object.entries(losses || {})
      .filter(([_, v]) => v)
      .map(([k]) => k);
    if (selectedLosses.length === 0) {
      drawText("No losses selected.");
    } else {
      drawText(`Types: ${selectedLosses.join(", ")}`);
    }

    // Medical
    const primaryProvider = medical?.providers?.[0];
    drawText("Medical / counseling", { bold: true });
    if (primaryProvider && primaryProvider.providerName) {
      drawText(`Provider: ${primaryProvider.providerName}`);
      drawText(
        `City: ${primaryProvider.city || "—"} | Phone: ${
          primaryProvider.phone || "—"
        }`
      );
      drawText(
        `Dates: ${primaryProvider.serviceDates || "—"} | Bill: ${
          primaryProvider.amountOfBill != null
            ? "$" + primaryProvider.amountOfBill
            : "—"
        }`
      );
    } else {
      drawText("No primary provider entered.");
    }

    // Employment
    const primaryJob = employment?.employmentHistory?.[0];
    drawText("Work & income", { bold: true });
    if (primaryJob && primaryJob.employerName) {
      drawText(`Employer: ${primaryJob.employerName}`);
      drawText(
        `Phone: ${primaryJob.employerPhone || "—"} | Net monthly wages: ${
          primaryJob.netMonthlyWages != null
            ? "$" + primaryJob.netMonthlyWages
            : "—"
        }`
      );
    } else {
      drawText("No employment info entered.");
    }

    // Funeral
    const primaryFuneralPayer = funeral?.payments?.[0];
    drawText("Funeral / burial", { bold: true });
    if (funeral?.funeralHomeName || funeral?.funeralBillTotal) {
      drawText(
        `Funeral home: ${funeral.funeralHomeName || "—"} | Phone: ${
          funeral.funeralHomePhone || "—"
        }`
      );
      drawText(
        `Total bill: ${
          funeral.funeralBillTotal != null
            ? "$" + funeral.funeralBillTotal
            : "—"
        }`
      );
      if (primaryFuneralPayer?.payerName) {
        drawText(
          `Payer: ${primaryFuneralPayer.payerName} (${
            primaryFuneralPayer.relationshipToVictim || "relationship not set"
          })`
        );
        drawText(
          `Amount paid: ${
            primaryFuneralPayer.amountPaid != null
              ? "$" + primaryFuneralPayer.amountPaid
              : "—"
          }`
        );
      }
    } else {
      drawText("No funeral information entered.");
    }

    // Certification
    drawText("Certification", { bold: true });
    drawText(
      `Signature: ${certification?.applicantSignatureName || "—"} | Date: ${
        certification?.applicantSignatureDate || "—"
      }`
    );

const pdfBytes = await pdfDoc.save();

return new NextResponse(pdfBytes as any, {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition":
      'attachment; filename="nxtstps_cvc_summary.pdf"',
  },
});
  } catch (err) {
    console.error("Error generating summary PDF", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
};

// naive word wrapping helper
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      lines.push(current.trim());
      current = w;
    } else {
      current += " " + w;
    }
  }
  if (current.trim().length) lines.push(current.trim());
  return lines;
}