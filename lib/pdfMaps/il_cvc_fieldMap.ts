// lib/pdfMaps/il_cvc_fieldMap.ts
import type { CompensationApplication } from "@/lib/compensationSchema";

/**
 * Simple helper to join first + last safely
 */
const fullName = (first?: string, last?: string) =>
  `${first ?? ""} ${last ?? ""}`.trim() || undefined;

/**
 * Convert "YYYY-MM-DD" -> separate month/day/year strings
 */
const dobParts = (dob?: string) => {
  if (!dob) return { month: "", day: "", year: "" };
  const [year, month, day] = dob.split("-");
  return {
    month: month ?? "",
    day: day ?? "",
    year: year ?? "",
  };
};

/**
 * Convert phone like "708-738-9919" or "(708)7389919" into (area, prefix, line)
 */
const phoneParts = (phone?: string) => {
  if (!phone) return { area: "", prefix: "", line: "" };
  const digits = phone.replace(/\D/g, "");
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  return { area, prefix, line };
};

/**
 * Map of PDF form field names -> function that pulls the right value
 * from CompensationApplication.
 */
export const IL_CVC_FIELD_MAP: Record<
  string,
  (app: CompensationApplication) => string | undefined
> = {
  // --- Victim section ---

  "Victims Name": (app) => fullName(app.victim.firstName, app.victim.lastName),

  // Victim DOB split into month / day / year
  "Date of Birth": (app) =>
    dobParts(app.victim.dateOfBirth).month || undefined,
  // the next two fields in the PDF are named "undefined" and "undefined_2"
  undefined: (app) => dobParts(app.victim.dateOfBirth).day || undefined,
  undefined_2: (app) => dobParts(app.victim.dateOfBirth).year || undefined,

  "Street Address": (app) => app.victim.streetAddress || undefined,
  Apt: (app) => app.victim.apt || undefined,
  City: (app) => app.victim.city || undefined,
  State: (app) => app.victim.state || undefined,
  "Zip Code": (app) => app.victim.zip || undefined,
  "Email Address": (app) => app.victim.email || undefined,

  // Victim cell phone split into (area) prefix-line
  "Cell Phone": (app) =>
    phoneParts(app.victim.cellPhone).area || undefined,
  undefined_3: (app) =>
    phoneParts(app.victim.cellPhone).prefix || undefined,
  undefined_4: (app) =>
    phoneParts(app.victim.cellPhone).line || undefined,

  "Alternate Phone": (app) =>
    phoneParts(app.victim.alternatePhone).area || undefined,
  // you can later wire undefined_5 / undefined_6 to prefix/line if you want

  "Work Phone": (app) =>
    phoneParts(app.victim.workPhone).area || undefined,
  // undefined_7 / undefined_8 would be work phone prefix/line

  // --- Applicant section ---

  "Applicants Name": (app) =>
    app.applicant.isSameAsVictim
      ? fullName(app.victim.firstName, app.victim.lastName)
      : fullName(app.applicant.firstName, app.applicant.lastName),

  // Applicant DOB split into month/day/year
  "Date of Birth_2": (app) =>
    dobParts(
      app.applicant.isSameAsVictim
        ? app.victim.dateOfBirth
        : app.applicant.dateOfBirth
    ).month || undefined,
  undefined_9: (app) =>
    dobParts(
      app.applicant.isSameAsVictim
        ? app.victim.dateOfBirth
        : app.applicant.dateOfBirth
    ).day || undefined,
  undefined_10: (app) =>
    dobParts(
      app.applicant.isSameAsVictim
        ? app.victim.dateOfBirth
        : app.applicant.dateOfBirth
    ).year || undefined,

  "Street Address_2": (app) =>
    app.applicant.isSameAsVictim
      ? app.victim.streetAddress || undefined
      : app.applicant.streetAddress || undefined,
  Apt_2: (app) =>
    app.applicant.isSameAsVictim
      ? app.victim.apt || undefined
      : app.applicant.apt || undefined,
  City_2: (app) =>
    app.applicant.isSameAsVictim
      ? app.victim.city || undefined
      : app.applicant.city || undefined,
  State_2: (app) =>
    app.applicant.isSameAsVictim
      ? app.victim.state || undefined
      : app.applicant.state || undefined,
  "Zip Code_2": (app) =>
    app.applicant.isSameAsVictim
      ? app.victim.zip || undefined
      : app.applicant.zip || undefined,
  "Email Address_2": (app) =>
    app.applicant.isSameAsVictim
      ? app.victim.email || undefined
      : app.applicant.email || undefined,

  // Applicant cell phone split into 3 fields
  "Cell Phone_2": (app) =>
    phoneParts(
      app.applicant.isSameAsVictim
        ? app.victim.cellPhone
        : app.applicant.cellPhone
    ).area || undefined,
  undefined_11: (app) =>
    phoneParts(
      app.applicant.isSameAsVictim
        ? app.victim.cellPhone
        : app.applicant.cellPhone
    ).prefix || undefined,
  undefined_12: (app) =>
    phoneParts(
      app.applicant.isSameAsVictim
        ? app.victim.cellPhone
        : app.applicant.cellPhone
    ).line || undefined,

  "Alternate Phone_2": (app) =>
    phoneParts(
      app.applicant.isSameAsVictim
        ? app.victim.alternatePhone
        : app.applicant.alternatePhone
    ).area || undefined,
  // undefined_13 / undefined_14 would be alt prefix/line

  "Work Phone_2": (app) =>
    phoneParts(
      app.applicant.isSameAsVictim
        ? app.victim.workPhone
        : app.applicant.workPhone
    ).area || undefined,

  "Relationship to the injured or deceased victim": (app) =>
    app.applicant.isSameAsVictim
      ? "Self"
      : app.applicant.relationshipToVictim || undefined,

  // --- Contact / advocate section (very light for now) ---

  Name: (app) => app.contact.advocateName || undefined,
  Telephone: (app) => app.contact.advocatePhone || undefined,
  Organization: (app) => app.contact.advocateOrganization || undefined,
  "Email Address_3": (app) => app.contact.advocateEmail || undefined,

  // --- Alternate contact ---

  Name_2: (app) => app.contact.alternateContactName || undefined,
  Telephone_2: (app) => app.contact.alternateContactPhone || undefined,
  "Relationship to you": (app) =>
    app.contact.alternateContactRelationship || undefined,

  // --- Crime section ---

  "Police Report": (app) => app.crime.policeReportNumber || undefined,
  "Date of Crime": (app) => app.crime.dateOfCrime || undefined,
  "Date Crime Reported": (app) => app.crime.dateReported || undefined,
  "Street Address where crime occurred": (app) =>
    app.crime.crimeAddress || undefined,
  City_3: (app) => app.crime.crimeCity || undefined,
  County: (app) => app.crime.crimeCounty || undefined,
  "Name of AgencyPolice Department crime reported to": (app) =>
    app.crime.reportingAgency || undefined,
  "Briefly Describe crime": (app) =>
    app.crime.crimeDescription || undefined,
  "Briefly Describe injuries": (app) =>
    app.crime.injuryDescription || undefined,
};