// lib/pdfMaps/in_cvc_coords.ts
// Indiana State Form 23776 – coordinate-based placement (no AcroForm fields).
// Origin: bottom-left. Letter 612×792 pt. Approximate positions from form layout.

import type { CompensationApplication } from "@/lib/compensationSchema";

const fullName = (first?: string, last?: string) =>
  `${first ?? ""} ${last ?? ""}`.trim() || "";

const dateToMDY = (d?: string) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return [m, day, y].filter(Boolean).join("/") || "";
};

export type INCoordItem = {
  pageIndex: number;
  x: number;
  y: number;
  getValue: (app: CompensationApplication) => string;
  fontSize?: number;
};

const FONT_SIZE = 9;

export const IN_CVC_COORDS: INCoordItem[] = [
  // Page 1 – Victim information (approximate positions)
  { pageIndex: 0, x: 50, y: 730, getValue: (app) => fullName(app.victim.firstName, app.victim.lastName), fontSize: FONT_SIZE },
  { pageIndex: 0, x: 50, y: 700, getValue: (app) => dateToMDY(app.victim.dateOfBirth), fontSize: FONT_SIZE },
  { pageIndex: 0, x: 50, y: 670, getValue: (app) => app.victim.streetAddress ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 50, y: 640, getValue: (app) => [app.victim.city, app.victim.state, app.victim.zip].filter(Boolean).join(", "), fontSize: FONT_SIZE },
  { pageIndex: 0, x: 50, y: 610, getValue: (app) => app.victim.email ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 50, y: 580, getValue: (app) => app.victim.cellPhone ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 50, y: 548, getValue: (app) => dateToMDY(app.crime.dateOfCrime), fontSize: FONT_SIZE },
  // Claimant (if different)
  { pageIndex: 0, x: 320, y: 730, getValue: (app) => app.applicant.isSameAsVictim ? "" : fullName(app.applicant.firstName, app.applicant.lastName), fontSize: FONT_SIZE },
  { pageIndex: 0, x: 320, y: 700, getValue: (app) => app.applicant.streetAddress ?? app.victim.streetAddress ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 320, y: 670, getValue: (app) => [app.applicant.city ?? app.victim.city, app.applicant.state ?? app.victim.state, app.applicant.zip ?? app.victim.zip].filter(Boolean).join(", "), fontSize: FONT_SIZE },
  { pageIndex: 0, x: 320, y: 640, getValue: (app) => app.applicant.relationshipToVictim ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 320, y: 610, getValue: (app) => app.applicant.cellPhone ?? app.victim.cellPhone ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 320, y: 580, getValue: (app) => app.applicant.email ?? app.victim.email ?? "", fontSize: FONT_SIZE },
  // Crime specific
  { pageIndex: 0, x: 50, y: 480, getValue: (app) => app.crime.crimeDescription ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 50, y: 420, getValue: (app) => app.crime.reportingAgency ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 320, y: 420, getValue: (app) => app.crime.policeReportNumber ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 50, y: 390, getValue: (app) => dateToMDY(app.crime.dateReported), fontSize: FONT_SIZE },
  { pageIndex: 0, x: 50, y: 360, getValue: (app) => `${app.crime.crimeCity ?? ""} ${app.crime.crimeCounty ?? ""}`.trim(), fontSize: FONT_SIZE },
  { pageIndex: 0, x: 50, y: 330, getValue: (app) => app.crime.offenderNames ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 320, y: 330, getValue: (app) => app.crime.offenderRelationship ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 50, y: 300, getValue: (app) => app.court.causeNumber ?? "", fontSize: FONT_SIZE },
  // Employment
  { pageIndex: 0, x: 50, y: 240, getValue: (app) => app.employment.employmentHistory?.[0]?.employerName ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 50, y: 210, getValue: (app) => app.employment.employmentHistory?.[0]?.employerAddress ?? "", fontSize: FONT_SIZE },
  { pageIndex: 0, x: 320, y: 210, getValue: (app) => app.employment.employmentHistory?.[0]?.employerPhone ?? "", fontSize: FONT_SIZE },
  // Page 2 – Certification / releases
  { pageIndex: 1, x: 50, y: 720, getValue: (app) => app.certification.applicantSignatureName ?? fullName(app.applicant.firstName ?? app.victim.firstName, app.applicant.lastName ?? app.victim.lastName), fontSize: FONT_SIZE },
  { pageIndex: 1, x: 320, y: 720, getValue: (app) => dateToMDY(app.certification.applicantSignatureDate), fontSize: FONT_SIZE },
];
