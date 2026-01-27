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
 * 
 * Field names are based on the actual IL CVC PDF form structure.
 * Multiple entries use "Row1", "Row2", etc. suffixes.
 */
export const IL_CVC_FIELD_MAP: Record<
  string,
  (app: CompensationApplication) => string | boolean | undefined
> = {
  // ============================================
  // SECTION 1: VICTIM INFORMATION
  // ============================================

  "Victims Name": (app) => fullName(app.victim.firstName, app.victim.lastName),

  // Victim DOB split into month / day / year
  "Date of Birth": (app) => dobParts(app.victim.dateOfBirth).month || undefined,
  undefined: (app) => dobParts(app.victim.dateOfBirth).day || undefined,
  undefined_2: (app) => dobParts(app.victim.dateOfBirth).year || undefined,

  "Street Address": (app) => app.victim.streetAddress || undefined,
  Apt: (app) => app.victim.apt || undefined,
  City: (app) => app.victim.city || undefined,
  State: (app) => app.victim.state || undefined,
  "Zip Code": (app) => app.victim.zip || undefined,
  "Email Address": (app) => app.victim.email || undefined,

  // Victim cell phone split into (area) prefix-line
  "Cell Phone": (app) => phoneParts(app.victim.cellPhone).area || undefined,
  undefined_3: (app) => phoneParts(app.victim.cellPhone).prefix || undefined,
  undefined_4: (app) => phoneParts(app.victim.cellPhone).line || undefined,

  "Alternate Phone": (app) => phoneParts(app.victim.alternatePhone).area || undefined,
  undefined_5: (app) => phoneParts(app.victim.alternatePhone).prefix || undefined,
  undefined_6: (app) => phoneParts(app.victim.alternatePhone).line || undefined,

  "Work Phone": (app) => phoneParts(app.victim.workPhone).area || undefined,
  undefined_7: (app) => phoneParts(app.victim.workPhone).prefix || undefined,
  undefined_8: (app) => phoneParts(app.victim.workPhone).line || undefined,

  // Victim gender checkboxes (only check one)
  Male: (app) => app.victim.genderIdentity?.toLowerCase().includes("male") && !app.victim.genderIdentity.toLowerCase().includes("transgender") && !app.victim.genderIdentity.toLowerCase().includes("female"),
  Female: (app) => app.victim.genderIdentity?.toLowerCase().includes("female") && !app.victim.genderIdentity.toLowerCase().includes("transgender") && !app.victim.genderIdentity.toLowerCase().includes("male"),
  "Transgender Female": (app) => app.victim.genderIdentity?.toLowerCase().includes("transgender") && app.victim.genderIdentity.toLowerCase().includes("female"),
  "Transgender Male": (app) => app.victim.genderIdentity?.toLowerCase().includes("transgender") && app.victim.genderIdentity.toLowerCase().includes("male"),
  "GenderqueerGender NonConforming GNC": (app) => app.victim.genderIdentity?.toLowerCase().includes("genderqueer") || app.victim.genderIdentity?.toLowerCase().includes("non-conforming") || app.victim.genderIdentity?.toLowerCase().includes("gnc"),
  "Prefer Not to Answer": (app) => app.victim.genderIdentity?.toLowerCase().includes("prefer not"),
  "Not Listed": (app) => app.victim.genderIdentity && !["male", "female", "transgender", "genderqueer", "prefer not"].some(term => app.victim.genderIdentity?.toLowerCase().includes(term)),

  // Victim marital status checkboxes
  Single: (app) => app.victim.maritalStatus?.toLowerCase() === "single",
  Married: (app) => app.victim.maritalStatus?.toLowerCase() === "married",
  Divorced: (app) => app.victim.maritalStatus?.toLowerCase() === "divorced",
  Widower: (app) => app.victim.maritalStatus?.toLowerCase() === "widow" || app.victim.maritalStatus?.toLowerCase() === "widower",
  "Civil Union Partner": (app) => app.victim.maritalStatus?.toLowerCase().includes("civil union"),

  // Victim race checkboxes
  White: (app) => app.victim.race?.toLowerCase().includes("white"),
  "Black or African American": (app) => app.victim.race?.toLowerCase().includes("black") || app.victim.race?.toLowerCase().includes("african"),
  Asian: (app) => app.victim.race?.toLowerCase().includes("asian"),
  "American Indian or Alaskan Native": (app) => app.victim.race?.toLowerCase().includes("indian") || app.victim.race?.toLowerCase().includes("alaskan") || app.victim.race?.toLowerCase().includes("native"),
  "Native Hawaiian": (app) => app.victim.race?.toLowerCase().includes("hawaiian"),
  "Other Race": (app) => {
    const race = app.victim.race?.toLowerCase() || "";
    if (!race) return undefined;
    const knownRaces = ["white", "black", "african", "asian", "indian", "alaskan", "native", "hawaiian"];
    return knownRaces.some(r => race.includes(r)) ? undefined : app.victim.race;
  },

  // Victim ethnicity checkboxes
  "Hispanic or Latino": (app) => app.victim.ethnicity?.toLowerCase().includes("hispanic") || app.victim.ethnicity?.toLowerCase().includes("latino"),
  "Not Hispanic or Latino": (app) => app.victim.ethnicity?.toLowerCase().includes("not") || (app.victim.ethnicity && !app.victim.ethnicity.toLowerCase().includes("hispanic") && !app.victim.ethnicity.toLowerCase().includes("latino")),

  // Victim disability checkboxes
  Yes: (app) => app.victim.hasDisability === true, // "Do you have a disability? Yes"
  "No If yes nature of disability": (app) => app.victim.hasDisability === false,
  Physical: (app) => app.victim.disabilityType === "physical",
  Mental: (app) => app.victim.disabilityType === "mental",
  Developmental: (app) => app.victim.disabilityType === "developmental",

  // ============================================
  // SECTION 1: APPLICANT INFORMATION
  // ============================================

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
  undefined_13: (app) =>
    phoneParts(
      app.applicant.isSameAsVictim
        ? app.victim.alternatePhone
        : app.applicant.alternatePhone
    ).prefix || undefined,
  undefined_14: (app) =>
    phoneParts(
      app.applicant.isSameAsVictim
        ? app.victim.alternatePhone
        : app.applicant.alternatePhone
    ).line || undefined,

  "Work Phone_2": (app) =>
    phoneParts(
      app.applicant.isSameAsVictim
        ? app.victim.workPhone
        : app.applicant.workPhone
    ).area || undefined,
  undefined_15: (app) =>
    phoneParts(
      app.applicant.isSameAsVictim
        ? app.victim.workPhone
        : app.applicant.workPhone
    ).prefix || undefined,
  undefined_16: (app) =>
    phoneParts(
      app.applicant.isSameAsVictim
        ? app.victim.workPhone
        : app.applicant.workPhone
    ).line || undefined,

  // Applicant gender checkboxes (same structure as victim)
  Male_2: (app) => {
    const gender = app.applicant.isSameAsVictim ? app.victim.genderIdentity : undefined;
    return gender?.toLowerCase().includes("male") && !gender.toLowerCase().includes("transgender") && !gender.toLowerCase().includes("female");
  },
  Female_2: (app) => {
    const gender = app.applicant.isSameAsVictim ? app.victim.genderIdentity : undefined;
    return gender?.toLowerCase().includes("female") && !gender.toLowerCase().includes("transgender") && !gender.toLowerCase().includes("male");
  },
  "Transgender Female_2": (app) => {
    const gender = app.applicant.isSameAsVictim ? app.victim.genderIdentity : undefined;
    return gender?.toLowerCase().includes("transgender") && gender.toLowerCase().includes("female");
  },
  "Transgender Male_2": (app) => {
    const gender = app.applicant.isSameAsVictim ? app.victim.genderIdentity : undefined;
    return gender?.toLowerCase().includes("transgender") && gender.toLowerCase().includes("male");
  },
  "GenderqueerGender NonConforming GNC_2": (app) => {
    const gender = app.applicant.isSameAsVictim ? app.victim.genderIdentity : undefined;
    return gender?.toLowerCase().includes("genderqueer") || gender?.toLowerCase().includes("non-conforming") || gender?.toLowerCase().includes("gnc");
  },
  "Prefer Not to Answer_2": (app) => {
    const gender = app.applicant.isSameAsVictim ? app.victim.genderIdentity : undefined;
    return gender?.toLowerCase().includes("prefer not");
  },
  "Not Listed_2": (app) => {
    const gender = app.applicant.isSameAsVictim ? app.victim.genderIdentity : undefined;
    return gender && !["male", "female", "transgender", "genderqueer", "prefer not"].some(term => gender.toLowerCase().includes(term));
  },

  // Applicant marital status checkboxes
  Single_2: (app) => {
    const status = app.applicant.isSameAsVictim ? app.victim.maritalStatus : undefined;
    return status?.toLowerCase() === "single";
  },
  Married_2: (app) => {
    const status = app.applicant.isSameAsVictim ? app.victim.maritalStatus : undefined;
    return status?.toLowerCase() === "married";
  },
  Divorced_2: (app) => {
    const status = app.applicant.isSameAsVictim ? app.victim.maritalStatus : undefined;
    return status?.toLowerCase() === "divorced";
  },
  Widower_2: (app) => {
    const status = app.applicant.isSameAsVictim ? app.victim.maritalStatus : undefined;
    return status?.toLowerCase() === "widow" || status?.toLowerCase() === "widower";
  },
  "Civil Union Partner_2": (app) => {
    const status = app.applicant.isSameAsVictim ? app.victim.maritalStatus : undefined;
    return status?.toLowerCase().includes("civil union");
  },

  "Relationship to the injured or deceased victim": (app) =>
    app.applicant.isSameAsVictim
      ? "Self"
      : app.applicant.relationshipToVictim || undefined,

  "If no what expenses are you requesting compensation for": (app) =>
    app.applicant.seekingOwnExpenses === false
      ? app.applicant.descriptionOfExpensesSought || undefined
      : undefined,

  // ============================================
  // SECTION 1: CONTACT INFORMATION
  // ============================================

  "If no language you are most comfortable speaking": (app) =>
    app.contact.prefersEnglish === false
      ? app.contact.preferredLanguage || undefined
      : undefined,

  Name: (app) => app.contact.advocateName || undefined,
  Telephone: (app) => app.contact.advocatePhone || undefined,
  Organization: (app) => app.contact.advocateOrganization || undefined,
  "Email Address_3": (app) => app.contact.advocateEmail || undefined,

  // Alternate contact
  Name_2: (app) => app.contact.alternateContactName || undefined,
  Telephone_2: (app) => app.contact.alternateContactPhone || undefined,
  "Relationship to you": (app) =>
    app.contact.alternateContactRelationship || undefined,

  // ============================================
  // SECTION 2: CRIME INFORMATION
  // ============================================

  "Police Report": (app) => app.crime.policeReportNumber || undefined,
  "Date of Crime": (app) => dobParts(app.crime.dateOfCrime).month || undefined,
  undefined_17: (app) => dobParts(app.crime.dateOfCrime).day || undefined,
  undefined_18: (app) => dobParts(app.crime.dateOfCrime).year || undefined,
  "Date Crime Reported": (app) => dobParts(app.crime.dateReported).month || undefined,
  undefined_19: (app) => dobParts(app.crime.dateReported).day || undefined,
  undefined_20: (app) => dobParts(app.crime.dateReported).year || undefined,
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

  // Offender information checkboxes
  "Check Box1": (app) => app.crime.offenderKnown === true, // "Do you know the identity of the offender(s)? Yes"
  "Check Box2": (app) => app.crime.offenderKnown === false, // "Do you know the identity of the offender(s)? No"
  "If yes offenders names": (app) => app.crime.offenderNames || undefined,
  "Relationship if any between victim and offenders": (app) =>
    app.crime.offenderRelationship || undefined,
  "Check Box3": (app) => app.crime.sexualAssaultKitPerformed === true, // "Was a sexual assault evidence collection kit performed? Yes"
  "Check Box4": (app) => app.crime.sexualAssaultKitPerformed === false, // "Was a sexual assault evidence collection kit performed? No"

  // ============================================
  // SECTION 2: CRIMINAL CASE INFORMATION
  // ============================================

  "Check Box5": (app) => app.court.offenderArrested === true, // "Was the offender arrested? Yes"
  "Check Box6": (app) => app.court.offenderArrested === false, // "Was the offender arrested? No"
  "Check Box7": (app) => app.court.offenderArrested === null, // "Was the offender arrested? Unknown"
  "Check Box8": (app) => app.court.offenderCharged === true, // "Has the offender been charged? Yes"
  "Check Box9": (app) => app.court.offenderCharged === false, // "Has the offender been charged? No"
  "Check Box10": (app) => app.court.offenderCharged === null, // "Has the offender been charged? Unknown"
  "Check Box11": (app) => app.court.applicantTestified === true, // "Were you required to testify? Yes"
  "Check Box12": (app) => app.court.applicantTestified === false, // "Were you required to testify? No"
  "Check Box13": (app) => app.court.applicantTestified === null, // "Were you required to testify? Unknown"

  "What was the outcome of the criminal case Include criminal case number if any 1": (app) =>
    app.court.criminalCaseOutcome || undefined,
  "What was the outcome of the criminal case Include criminal case number if any 2": (app) =>
    app.court.criminalCaseNumber || undefined,
  undefined_21: (app) => app.court.criminalCaseNumber || undefined, // Additional case number field

  "Check Box14": (app) => app.court.restitutionOrdered === true, // "Has restitution been ordered? Yes"
  "Check Box15": (app) => app.court.restitutionOrdered === false, // "Has restitution been ordered? No"
  Amount: (app) => app.court.restitutionAmount?.toString() || undefined, // Restitution amount

  // Human trafficking case
  "Check Box16": (app) => app.court.humanTraffickingCaseFiled === true,
  "Check Box17": (app) => app.court.humanTraffickingCaseFiled === false,
  "Check Box18": (app) => app.court.humanTraffickingCaseFiled === null,
  // NEW: Human trafficking testimony (separate from regular criminal case testimony)
  // Note: PDF field names need to be verified - these may be different checkboxes
  "What was the outcome of the Human Trafficking court case Include criminal case number if any 1": (app) =>
    app.court.humanTraffickingCaseOutcome || undefined,
  "What was the outcome of the Human Trafficking court case Include criminal case number if any 2": (app) =>
    app.court.humanTraffickingCaseNumber || undefined,

  // Use of force
  "Check Box19": (app) =>
    app.protectionAndCivil.involvesUseOfForceByLawEnforcement === true,
  "Check Box20": (app) =>
    app.protectionAndCivil.involvesUseOfForceByLawEnforcement === false,
  Text35: (app) =>
    app.protectionAndCivil.useOfForceProceedingsDescription || undefined,

  // Order of protection
  "Check Box21": (app) => app.protectionAndCivil.hasOrderOfProtection === true,
  "Check Box22": (app) => app.protectionAndCivil.hasOrderOfProtection === false,
  Text36: (app) => app.protectionAndCivil.orderNumber || undefined,
  Text38: (app) => app.protectionAndCivil.orderIssueDate || undefined,
  "Check Box39": (app) => app.protectionAndCivil.orderExpirationDate ? true : undefined,
  Text37: (app) => app.protectionAndCivil.orderExpirationDate || undefined,

  // Supplemental documentation
  "Check Box40": (app) =>
    app.protectionAndCivil.supplementalDocsProvided === true,
  Text39: (app) =>
    app.protectionAndCivil.supplementalDocsDescription || undefined,

  // Civil case
  "Check Box42": (app) => app.protectionAndCivil.civilLawsuitFiled === true,
  "Check Box43": (app) => app.protectionAndCivil.civilLawsuitFiled === false,
  Text44: (app) => app.protectionAndCivil.civilAttorneyName || undefined,
  "ARDC No": (app) => app.protectionAndCivil.civilAttorneyArdc || undefined,
  Text45: (app) => app.protectionAndCivil.civilAttorneyPhone || undefined,
  Text46: (app) => app.protectionAndCivil.civilAttorneyEmail || undefined,

  // ============================================
  // SECTION 3: LOSSES CLAIMED (Checkboxes)
  // ============================================
  // Note: These checkboxes correspond to the losses claimed section
  // Mapping based on the order in the PDF form

  "Check Box23": (app) => app.losses.medicalHospital, // Medical/Hospital
  "Check Box24": (app) => app.losses.dental, // Dental
  "Check Box25": (app) => app.losses.transportation, // Transportation
  "Check Box26": (app) => app.losses.accessibilityCosts, // Accessibility Costs
  "Check Box27": (app) => app.losses.crimeSceneCleanup, // Crime Scene Cleanup
  "Check Box28": (app) => app.losses.counseling, // Counseling
  "Check Box29": (app) => app.losses.relocationCosts, // Relocation Costs
  "Check Box30": (app) => app.losses.temporaryLodging, // Temporary Lodging
  "Check Box31": (app) => app.losses.tattooRemoval, // Tattoo Removal
  "Check Box33": (app) => app.losses.lossOfEarnings, // Loss of Earnings
  "Check Box34": (app) => app.losses.tuition, // Tuition
  Text41: (app) => app.losses.replacementServiceLoss ? "Yes" : undefined, // Replacement Service Loss (may need checkbox)
  "Check Box47": (app) => app.losses.locks, // Locks
  Text48: (app) => app.losses.windows ? "Yes" : undefined, // Windows (may need checkbox)
  Text50: (app) => app.losses.clothing ? "Yes" : undefined, // Clothing (may need checkbox)
  Text51: (app) => app.losses.bedding ? "Yes" : undefined, // Bedding (may need checkbox)
  Text52: (app) => app.losses.prostheticAppliances ? "Yes" : undefined, // Prosthetic Appliances (may need checkbox)
  Text53: (app) => app.losses.eyeglassesContacts ? "Yes" : undefined, // Eyeglasses/Contacts (may need checkbox)
  "Check Box54.4.0": (app) => app.losses.hearingAids, // Hearing Aids
  "Check Box54.4.1": (app) => app.losses.replacementCosts, // Replacement Costs
  "Check Box54.0": (app) => app.losses.lossOfSupport, // Loss of Support
  "Check Box54.1": (app) => app.losses.towingStorage, // Towing and Storage
  "Check Box54.2": (app) => app.losses.funeralBurial, // Funeral/Burial
  "Check Box54.3": (app) => app.losses.lossOfFutureEarnings, // Loss of Future Earnings
  fill_5: (app) => app.losses.legalFees ? "Yes" : undefined, // Legal Fees
  fill_23: (app) => app.losses.doors ? "Yes" : undefined, // Doors
  fill_24: (app) => app.losses.headstone ? "Yes" : undefined, // Headstone

  // ============================================
  // SECTION 4: MEDICAL INFORMATION
  // ============================================
  // Multiple rows for medical providers (Row1-Row5)

  "Medical ProviderRow1": (app) => app.medical.providers?.[0]?.providerName || undefined,
  CityRow1: (app) => app.medical.providers?.[0]?.city || undefined,
  "Provider Phone NoRow1": (app) => app.medical.providers?.[0]?.phone || undefined,
  "Dates of ServicesRow1": (app) => app.medical.providers?.[0]?.serviceDates || undefined,
  "Amount of BillRow1": (app) => app.medical.providers?.[0]?.amountOfBill?.toString() || undefined,

  "Medical ProviderRow2": (app) => app.medical.providers?.[1]?.providerName || undefined,
  CityRow2: (app) => app.medical.providers?.[1]?.city || undefined,
  "Provider Phone NoRow2": (app) => app.medical.providers?.[1]?.phone || undefined,
  "Dates of ServicesRow2": (app) => app.medical.providers?.[1]?.serviceDates || undefined,
  "Amount of BillRow2": (app) => app.medical.providers?.[1]?.amountOfBill?.toString() || undefined,

  "Medical ProviderRow3": (app) => app.medical.providers?.[2]?.providerName || undefined,
  CityRow3: (app) => app.medical.providers?.[2]?.city || undefined,
  "Provider Phone NoRow3": (app) => app.medical.providers?.[2]?.phone || undefined,
  "Dates of ServicesRow3": (app) => app.medical.providers?.[2]?.serviceDates || undefined,
  "Amount of BillRow3": (app) => app.medical.providers?.[2]?.amountOfBill?.toString() || undefined,

  "Medical ProviderRow4": (app) => app.medical.providers?.[3]?.providerName || undefined,
  CityRow4: (app) => app.medical.providers?.[3]?.city || undefined,
  "Provider Phone NoRow4": (app) => app.medical.providers?.[3]?.phone || undefined,
  "Dates of ServicesRow4": (app) => app.medical.providers?.[3]?.serviceDates || undefined,
  "Amount of BillRow4": (app) => app.medical.providers?.[3]?.amountOfBill?.toString() || undefined,

  "Medical ProviderRow5": (app) => app.medical.providers?.[4]?.providerName || undefined,
  CityRow5: (app) => app.medical.providers?.[4]?.city || undefined,
  "Provider Phone NoRow5": (app) => app.medical.providers?.[4]?.phone || undefined,
  "Dates of ServicesRow5": (app) => app.medical.providers?.[4]?.serviceDates || undefined,
  "Amount of BillRow5": (app) => app.medical.providers?.[4]?.amountOfBill?.toString() || undefined,

  // Insurance and other collateral sources
  "Insurance and Other Collateral sources": (app) => app.medical.hasOtherSources === true,
  Yes_15: (app) => app.medical.hasOtherSources === true,
  "Medical Card": (app) => app.medical.medicalCard || undefined,
  Medicare: (app) => app.medical.medicare || undefined,
  "Medical Insurance": (app) => app.medical.medicalInsurance || undefined,
  "Union Insurance": (app) => app.medical.unionInsurance || undefined,
  "VisionDental Insurance etc": (app) => app.medical.dentalVisionInsurance || undefined,
  "Workers Compensation": (app) => app.medical.workersComp || undefined,
  "Veterans Administration": (app) => app.medical.veteransAdmin || undefined,
  "SSI or SSDI": (app) => app.medical.ssiSsdi || undefined,
  "Auto Insurance": (app) => app.medical.autoInsurance || undefined,
  "Other Litigation": (app) => app.medical.otherInsuranceDescription || undefined,
  Discount: (app) => undefined, // Not in schema
  Insurance: (app) => undefined, // Generic field, may map to otherInsuranceDescription

  // ============================================
  // SECTION 5: EMPLOYMENT INFORMATION
  // ============================================

  "Are you applying for loss of earnings due to the crime": (app) =>
    app.employment.isApplyingForLossOfEarnings === true,
  Yes_16: (app) => app.employment.isApplyingForLossOfEarnings === true,

  // Multiple rows for employers (Row1-Row3)
  "Name of EmployerRow1": (app) =>
    app.employment.employmentHistory?.[0]?.employerName || undefined,
  "Employers AddressRow1": (app) =>
    app.employment.employmentHistory?.[0]?.employerAddress || undefined,
  "Employers Phone NoRow1": (app) =>
    app.employment.employmentHistory?.[0]?.employerPhone || undefined,
  "Victims Net Monthly Wages Take Home PayRow1": (app) =>
    app.employment.employmentHistory?.[0]?.netMonthlyWages?.toString() || undefined,

  "Name of EmployerRow2": (app) =>
    app.employment.employmentHistory?.[1]?.employerName || undefined,
  "Employers AddressRow2": (app) =>
    app.employment.employmentHistory?.[1]?.employerAddress || undefined,
  "Employers Phone NoRow2": (app) =>
    app.employment.employmentHistory?.[1]?.employerPhone || undefined,
  "Victims Net Monthly Wages Take Home PayRow2": (app) =>
    app.employment.employmentHistory?.[1]?.netMonthlyWages?.toString() || undefined,

  "Name of EmployerRow3": (app) =>
    app.employment.employmentHistory?.[2]?.employerName || undefined,
  "Employers AddressRow3": (app) =>
    app.employment.employmentHistory?.[2]?.employerAddress || undefined,
  "Employers Phone NoRow3": (app) =>
    app.employment.employmentHistory?.[2]?.employerPhone || undefined,
  "Victims Net Monthly Wages Take Home PayRow3": (app) =>
    app.employment.employmentHistory?.[2]?.netMonthlyWages?.toString() || undefined,

  "Did you receive sick vacation personal time or disability benefits from work after the crime": (app) =>
    app.employment.receivedSickOrVacationOrDisability === true,
  Yes_17: (app) => app.employment.receivedSickOrVacationOrDisability === true,
  Amounts: (app) => app.employment.benefitNotes || undefined, // Benefit notes/amounts

  // Benefit amount fields (fill_7, fill_9, fill_11, fill_13, fill_14) - PDF has separate $ fields
  fill_7: (app) => app.employment.sickPayAmount?.toString() || undefined, // Sick $
  fill_9: (app) => app.employment.vacationPayAmount?.toString() || undefined, // Vacation $
  fill_11: (app) => app.employment.personalTimeAmount?.toString() || undefined, // Personal $
  fill_13: (app) => app.employment.disabilityPayAmount?.toString() || undefined, // Disability $
  fill_14: (app) => app.employment.otherBenefitAmount?.toString() || undefined, // Other $

  // ============================================
  // SECTION 6: FUNERAL/BURIAL INFORMATION
  // ============================================

  "Name of Funeral Home": (app) => app.funeral.funeralHomeName || undefined,
  "Funeral Home Phone Number": (app) => app.funeral.funeralHomePhone || undefined,
  "Total Amount of Funeral Bill": (app) =>
    app.funeral.funeralBillTotal?.toString() || undefined,

  // Funeral payers (multiple rows - PDF has 5 rows)
  // Row 1
  fill_15: (app) => app.funeral.payments?.[0]?.payerName || undefined,
  fill_17: (app) => app.funeral.payments?.[0]?.relationshipToVictim || undefined,
  fill_18: (app) => app.funeral.payments?.[0]?.amountPaid?.toString() || undefined,
  // Row 2
  fill_20: (app) => app.funeral.payments?.[1]?.payerName || undefined,
  fill_21: (app) => app.funeral.payments?.[1]?.amountPaid?.toString() || undefined,
  // Row 3-5 (need to identify correct field names - may be fill_22, fill_23, etc.)
  // Note: Cemetery payers use different fields (need to identify from PDF)

  // ESVF (Chicago Emergency Supplemental Victims Fund)
  "Check Box32": (app) => app.funeral.receivedChicagoESVF === true,
  "Check Box35": (app) => app.funeral.receivedChicagoESVF === false,
  Text56: (app) => app.funeral.esvfAmount?.toString() || undefined,

  // Cemetery information
  "Name of Cemetery": (app) => app.funeral.cemeteryName || undefined,
  "Cemetery Phone Number": (app) => app.funeral.cemeteryPhone || undefined,
  "Total Amount of Cemetery Bill": (app) =>
    app.funeral.cemeteryBillTotal?.toString() || undefined,

  "Total Amount of FuneralCemetery Expenses": (app) => {
    const funeral = app.funeral.funeralBillTotal || 0;
    const cemetery = app.funeral.cemeteryBillTotal || 0;
    const total = funeral + cemetery;
    return total > 0 ? total.toString() : undefined;
  },

  // NEW: Death benefits section (Section 6, Part B)
  fill_30: (app) => app.funeral.deathBenefitChicagoFund?.toString() || undefined, // Death Benefit From City of Chicago Fund
  fill_31: (app) => app.funeral.lifeHealthAccidentInsurance?.toString() || undefined, // Life, health accident, vehicle towing, or liability insurance
  fill_32: (app) => app.funeral.unemploymentPayments?.toString() || undefined, // Unemployment Payments
  fill_33: (app) => app.funeral.veteransSocialSecurityBurial?.toString() || undefined, // Veterans or Social Security Burial Benefits
  // Note: Worker's Compensation or Dram Shop and Federal Medicare/Public Aid may use different field names

  // Life insurance (multiple rows Row1-Row3)
  "Did the victim have a life insurance policy": (app) =>
    app.funeral.lifeInsurancePolicyExists === true,
  Yes_18: (app) => app.funeral.lifeInsurancePolicyExists === true,
  "Name of Insurance CompanyRow1": (app) =>
    app.funeral.lifeInsuranceCompany || undefined,
  "Name of BeneficiaryRow1": (app) =>
    app.funeral.lifeInsuranceBeneficiary || undefined,
  "Beneficiarys Phone NoRow1": (app) =>
    app.funeral.lifeInsuranceBeneficiaryPhone || undefined,
  "Amount PaidRow1": (app) =>
    app.funeral.lifeInsuranceAmountPaid?.toString() || undefined,

  // Additional life insurance rows (if multiple policies)
  "Name of Insurance CompanyRow2": (app) => undefined, // Not in current schema
  "Name of BeneficiaryRow2": (app) => undefined,
  "Beneficiarys Phone NoRow2": (app) => undefined,
  "Amount PaidRow2": (app) => undefined,
  "Name of Insurance CompanyRow3": (app) => undefined,
  "Name of BeneficiaryRow3": (app) => undefined,
  "Beneficiarys Phone NoRow3": (app) => undefined,
  "Amount PaidRow3": (app) => undefined,

  // Loss of support dependents
  "Was the victim employed during the six 6 months before the crime": (app) => {
    // This would need to be determined from employment history
    return app.employment.employmentHistory?.length > 0 ? true : undefined;
  },
  Yes_19: (app) => app.employment.employmentHistory?.length > 0 ? true : undefined,

  // Dependents (multiple rows Row1-Row3)
  "Name of DependentRow1": (app) => app.funeral.dependents?.[0]?.name || undefined,
  "Relationship to VictimRow1": (app) =>
    app.funeral.dependents?.[0]?.relationshipToVictim || undefined,
  "Date of BirthRow1": (app) => app.funeral.dependents?.[0]?.dateOfBirth || undefined,
  "NamePhone Number of Legal GuardianRow1": (app) =>
    app.funeral.dependents?.[0]?.guardianNamePhone || undefined,

  "Name of DependentRow2": (app) => app.funeral.dependents?.[1]?.name || undefined,
  "Relationship to VictimRow2": (app) =>
    app.funeral.dependents?.[1]?.relationshipToVictim || undefined,
  "Date of BirthRow2": (app) => app.funeral.dependents?.[1]?.dateOfBirth || undefined,
  "NamePhone Number of Legal GuardianRow2": (app) =>
    app.funeral.dependents?.[1]?.guardianNamePhone || undefined,

  "Name of DependentRow3": (app) => app.funeral.dependents?.[2]?.name || undefined,
  "Relationship to VictimRow3": (app) =>
    app.funeral.dependents?.[2]?.relationshipToVictim || undefined,
  "Date of BirthRow3": (app) => app.funeral.dependents?.[2]?.dateOfBirth || undefined,
  "NamePhone Number of Legal GuardianRow3": (app) =>
    app.funeral.dependents?.[2]?.guardianNamePhone || undefined,

  // ============================================
  // SECTION 7: CERTIFICATION
  // ============================================

  // Certification checkboxes
  "Check Box54.4.2": (app) => app.certification.acknowledgesSubrogation === true, // Acknowledges Subrogation
  No_13: (app) => app.certification.acknowledgesSubrogation === false,
  // Note: Release and Perjury checkboxes need to be identified - may be different field names
  // Based on filled PDF, Check Box54.4.2 is checked for subrogation

  // Applicant signature and date
  Text57: (app) => app.certification.applicantSignatureName || undefined,
  Text58: (app) => app.certification.applicantSignatureDate || undefined,

  // Attorney information
  "Are you being represented by counsel for this Crime Victims Compensation Claim": (app) =>
    app.certification.representedByAttorney === true,
  Yes_20: (app) => app.certification.representedByAttorney === true,
  "Name of Lawyer": (app) => app.certification.attorneyName || undefined,
  "ARDC No_2": (app) => app.certification.attorneyArdc || undefined,
  Address: (app) => app.certification.attorneyAddress || undefined,
  City_4: (app) => app.certification.attorneyCity || undefined,
  State_3: (app) => app.certification.attorneyState || undefined,
  "Zip Code_3": (app) => app.certification.attorneyZip || undefined,
  Telephone_3: (app) => phoneParts(app.certification.attorneyPhone).area || undefined,
  undefined_22: (app) => phoneParts(app.certification.attorneyPhone).prefix || undefined,
  undefined_23: (app) => phoneParts(app.certification.attorneyPhone).line || undefined,
  "Email Address_4": (app) => app.certification.attorneyEmail || undefined,
};
