/**
 * Manual override seed for the IL CVC intake-v2 renderer.
 *
 * The PDF ingestion pipeline (scripts/bootstrap-il-intake-v2.ts) populates
 * cvc_form_fields from the AcroForm, which gives us one row per *widget*.
 * That means the gender radio group on the form surfaces as 7 checkbox
 * rows (male / female / transgender_male / …) instead of one dropdown.
 *
 * This seed layers a curated IA on top:
 *   1. Resets every field for the IL template to hidden + null section.
 *   2. Upserts "synthetic" consolidated fields (victim_gender,
 *      victim_marital_status, offender_arrested, …) that collapse the
 *      widget-per-option rows into single <select> dropdowns.
 *   3. Updates PDF-derived text fields (name, address, phone, etc.) with
 *      human-readable labels and PDF-order display_order.
 *
 * Dropdowns are stored as field_type='text' + input_options (FieldRenderer
 * already renders that pattern as a <select>). Promoting to a first-class
 * field_type='select' would require extending the CHECK constraint in
 * supabase/migrations/20260506000000_cvc_form_processing.sql.
 *
 * Idempotent. Run: npx tsx scripts/seed-il-intake-fields.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

(function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
})();

const TEMPLATE_ID = "5a71eecb-93fe-4727-8676-cb47c2351eb0";

type SectionKey =
  | "victim_info"
  | "applicant_info"
  | "contact_info"
  | "crime_info"
  | "protection_civil"
  | "losses_claimed"
  | "medical"
  | "employment"
  | "funeral"
  | "certification";

type FieldType =
  | "text"
  | "textarea"
  | "checkbox"
  | "date"
  | "currency"
  | "signature"
  | "repeating_rows";

interface InputOption {
  value: string;
  label: string;
}

interface RepeatingRowColumn {
  fieldKey: string;
  label: string;
  fieldType: "text" | "currency" | "date" | "phone";
  placeholder?: string;
}

interface RepeatingRowsConfig {
  columns: RepeatingRowColumn[];
  minRows: number;
  maxRows: number;
}

interface FieldSpec {
  field_key: string;
  label: string;
  /** Omit → "text". Dropdowns use "text" + input_options (renders as <select>). */
  field_type?: FieldType;
  /** For dropdowns: option list. For repeating_rows: column + row-count config. */
  input_options?: InputOption[] | RepeatingRowsConfig;
  help_text?: string;
  /** Synthetic rows (not present in the ingested PDF) need a marker. */
  synthetic?: boolean;
  /** Gate section completion. Defaults to false; mark true for asterisked fields on the PDF. */
  required?: boolean;
}

// -----------------------------------------------------------------------------
// Reusable option lists
// -----------------------------------------------------------------------------

const YES_NO: InputOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const YES_NO_UNKNOWN: InputOption[] = [
  ...YES_NO,
  { value: "unknown", label: "Unknown" },
];

const GENDER: InputOption[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "transgender_female", label: "Transgender Female" },
  { value: "transgender_male", label: "Transgender Male" },
  { value: "gnc", label: "Genderqueer / Gender Non-Conforming (GNC)" },
  { value: "prefer_not_to_answer", label: "Prefer Not to Answer" },
  { value: "not_listed", label: "Not Listed" },
];

const MARITAL: InputOption[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widow(er)" },
  { value: "civil_union", label: "Civil Union Partner" },
];

const RACE: InputOption[] = [
  { value: "white", label: "White" },
  { value: "black", label: "Black or African American" },
  { value: "asian", label: "Asian" },
  { value: "american_indian", label: "American Indian or Alaskan Native" },
  { value: "native_hawaiian", label: "Native Hawaiian" },
  { value: "other", label: "Other" },
];

const ETHNICITY: InputOption[] = [
  { value: "hispanic", label: "Hispanic or Latino" },
  { value: "not_hispanic", label: "Not Hispanic or Latino" },
];

const RELATIONSHIP: InputOption[] = [
  { value: "self", label: "Self (I am the victim)" },
  { value: "parent", label: "Parent" },
  { value: "legal_guardian", label: "Legal Guardian" },
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "other_relative", label: "Other Relative" },
  { value: "expense_payer", label: "Person who paid victim expenses" },
];

const STATISTICAL_HELP =
  "This information is used for statistical purposes only and will not affect your application. Providing this information is voluntary.";

// -----------------------------------------------------------------------------
// Section definitions — array order = display_order within each section.
// -----------------------------------------------------------------------------

const SECTIONS: Record<SectionKey, FieldSpec[]> = {
  // --------- Section 1A — Victim Information (PDF page 4) ---------
  victim_info: [
    { field_key: "victims_name", label: "Victim's Name", required: true },
    { field_key: "date_of_birth", label: "Date of Birth", field_type: "date", required: true },
    {
      field_key: "victim_legal_guardianship_yn",
      label: "Is the injured victim a minor or incapacitated adult with a legal guardian?",
      input_options: YES_NO,
      help_text: "If yes, please provide documentation to show guardianship.",
      synthetic: true,
    },
    { field_key: "street_address", label: "Street Address", required: true },
    { field_key: "apt", label: "Apt #" },
    { field_key: "city", label: "City", required: true },
    { field_key: "state", label: "State", required: true },
    { field_key: "zip_code", label: "Zip Code", required: true },
    { field_key: "email_address", label: "E-mail Address", required: true },
    { field_key: "cell_phone", label: "Cell Phone", required: true },
    { field_key: "alternate_phone", label: "Alternate Phone" },
    {
      field_key: "victim_gender",
      label: "Gender",
      input_options: GENDER,
      synthetic: true,
    },
    {
      field_key: "victim_marital_status",
      label: "Marital Status",
      input_options: MARITAL,
      synthetic: true,
    },
    {
      field_key: "victim_race",
      label: "Race",
      input_options: RACE,
      help_text: STATISTICAL_HELP,
      synthetic: true,
    },
    {
      field_key: "victim_ethnicity",
      label: "Ethnicity",
      input_options: ETHNICITY,
      help_text: STATISTICAL_HELP,
      synthetic: true,
    },
    {
      field_key: "victim_has_disability_yn",
      label: "Do you have a disability?",
      input_options: YES_NO,
      synthetic: true,
    },
    {
      field_key: "no_if_yes_nature_of_disability",
      label: "If yes, nature of disability",
      help_text: "Describe the nature of the disability. Leave blank if not applicable.",
    },
  ],

  // --------- Section 1B — Applicant Information (pages 4-5) ---------
  applicant_info: [
    { field_key: "applicant_name", label: "Applicant's Name", synthetic: true, required: true },
    { field_key: "date_of_birth_2", label: "Applicant's Date of Birth", field_type: "date" },
    { field_key: "street_address_2", label: "Applicant's Street Address" },
    { field_key: "apt_2", label: "Apt #" },
    { field_key: "city_2", label: "City" },
    { field_key: "state_2", label: "State" },
    { field_key: "zip_code_2", label: "Zip Code" },
    { field_key: "email_address_2", label: "E-mail Address" },
    { field_key: "cell_phone_2", label: "Cell Phone" },
    { field_key: "alternate_phone_2", label: "Alternate Phone" },
    {
      field_key: "applicant_gender",
      label: "Applicant Gender",
      input_options: GENDER,
      synthetic: true,
    },
    {
      field_key: "applicant_marital_status",
      label: "Applicant Marital Status",
      input_options: MARITAL,
      synthetic: true,
    },
    {
      field_key: "applicant_relationship_to_victim",
      label: "Relationship to the injured or deceased victim",
      input_options: RELATIONSHIP,
      synthetic: true,
    },
    {
      field_key: "applicant_seeking_own_expenses_yn",
      label: "Are you seeking compensation for your own expenses?",
      input_options: YES_NO,
      synthetic: true,
    },
  ],

  // --------- Section 1C — Contact Information (page 5) ---------
  contact_info: [
    {
      field_key: "english_preferred_language_yn",
      label: "Is English your preferred language?",
      input_options: YES_NO,
      synthetic: true,
    },
    {
      field_key: "if_no_language_you_are_most_comfortable_speaking",
      label: "If no, what language are you most comfortable speaking?",
    },
    {
      field_key: "working_with_advocate_yn",
      label: "Are you working with an advocate?",
      input_options: YES_NO,
      help_text:
        "If yes, please provide your advocate's name, telephone, organization, and email address.",
      synthetic: true,
    },
    { field_key: "name", label: "Advocate Name" },
    { field_key: "organization", label: "Advocate Organization" },
    { field_key: "telephone", label: "Advocate Telephone" },
    { field_key: "email_address_3", label: "Advocate E-mail Address" },
    {
      field_key: "consent_advocate_discuss_claim_yn",
      label:
        "Do you consent to allow the Attorney General's Office to discuss your claim with your advocate?",
      input_options: YES_NO,
      synthetic: true,
    },
    {
      field_key: "another_person_to_contact_yn",
      label: "Is there another person you would prefer us to contact?",
      input_options: YES_NO,
      synthetic: true,
    },
    { field_key: "name_2", label: "Alternate Contact Name" },
    { field_key: "telephone_2", label: "Alternate Contact Telephone" },
    { field_key: "relationship_to_you", label: "Alternate Contact — Relationship to you" },
  ],

  // --------- Section 2A — Crime Information (page 5) ---------
  // Order mirrors the PDF Section 2A layout (Police Report #, Date of Crime,
  // Date Reported, Street Address, City, County, Agency, Describe crime,
  // Describe injuries, offender identity, …). Many of the top-of-section
  // fields are synthetic because the underlying AcroForm widgets are
  // unnamed Text NN and can't be safely mapped from `cvc_form_fields`
  // without position correlation.
  crime_info: [
    {
      field_key: "police_report_number",
      label: "Police Report #",
      synthetic: true,
      required: true,
    },
    {
      field_key: "date_of_crime",
      label: "Date of Crime",
      field_type: "date",
      synthetic: true,
      required: true,
    },
    {
      field_key: "date_crime_reported",
      label: "Date Crime Reported",
      field_type: "date",
      synthetic: true,
      required: true,
    },
    {
      field_key: "crime_street_address",
      label: "Street Address where crime occurred",
      synthetic: true,
      required: true,
    },
    { field_key: "city_3", label: "City where crime occurred", required: true },
    { field_key: "county", label: "County where crime occurred", required: true },
    {
      field_key: "agency_crime_reported_to",
      label: "Name of Agency / Police Department crime reported to",
      synthetic: true,
      required: true,
    },
    {
      field_key: "briefly_describe_crime",
      label: "Briefly describe the crime",
      field_type: "textarea",
      synthetic: true,
      required: true,
    },
    {
      field_key: "briefly_describe_injuries",
      label: "Briefly describe injuries",
      required: true,
    },
    {
      field_key: "knows_offender_identity_yn",
      label: "Do you know the identity of the offender(s)?",
      input_options: YES_NO,
      synthetic: true,
    },
    {
      field_key: "if_yes_offenders_names",
      label: "If yes, offender(s) name(s)",
    },
    {
      field_key: "sexual_assault_kit_performed_yn",
      label: "Was a sexual assault evidence collection kit performed at a hospital?",
      input_options: YES_NO,
      synthetic: true,
    },
    // Section 2B — Criminal Case
    {
      field_key: "offender_arrested",
      label: "Was the offender arrested?",
      input_options: YES_NO_UNKNOWN,
      synthetic: true,
    },
    {
      field_key: "offender_charged_in_court",
      label: "Has the offender been charged in court?",
      input_options: YES_NO_UNKNOWN,
      synthetic: true,
    },
    {
      field_key: "required_to_testify",
      label: "Were you required to testify for this case?",
      input_options: YES_NO_UNKNOWN,
      synthetic: true,
    },
    {
      field_key:
        "what_was_the_outcome_of_the_criminal_case_include_criminal_case_number_if_any_1",
      label: "Outcome of criminal case (line 1)",
      help_text: "Include criminal case number if known.",
    },
    {
      field_key:
        "what_was_the_outcome_of_the_criminal_case_include_criminal_case_number_if_any_2",
      label: "Outcome of criminal case (continued)",
    },
    {
      field_key: "restitution_ordered_yn",
      label: "Has restitution been ordered against the offender?",
      input_options: YES_NO,
      synthetic: true,
    },
    {
      field_key: "offender_charged_human_trafficking",
      label: "Has the offender been charged in a Human Trafficking court proceeding?",
      input_options: YES_NO_UNKNOWN,
      synthetic: true,
    },
    {
      field_key: "required_to_testify_human_trafficking",
      label: "Were you required to testify for the Human Trafficking court case?",
      input_options: YES_NO_UNKNOWN,
      synthetic: true,
    },
    {
      field_key:
        "what_was_the_outcome_of_the_human_trafficking_court_case_include_criminal_case_number_if_any_1",
      label: "Outcome of Human Trafficking court case (line 1)",
      help_text: "Include criminal case number if known.",
    },
    {
      field_key:
        "what_was_the_outcome_of_the_human_trafficking_court_case_include_criminal_case_number_if_any_2",
      label: "Outcome of Human Trafficking court case (continued)",
    },
  ],

  // --------- Section 2B-E — Court & Protection (page 6) ---------
  protection_civil: [
    {
      field_key: "use_of_force_involved_yn",
      label: "Did the crime alleged involve a law enforcement officer's use of force?",
      input_options: YES_NO,
      synthetic: true,
    },
    {
      field_key: "order_of_protection_obtained_yn",
      label:
        "Did you obtain a Plenary Domestic Violence Order of Protection, Civil No-Contact Order, or Stalking No Contact order?",
      input_options: YES_NO,
      synthetic: true,
    },
    {
      field_key: "supplemental_documentation_providing_yn",
      label: "Are you providing supplemental documentation with this application?",
      input_options: YES_NO,
      synthetic: true,
    },
    {
      field_key: "civil_lawsuit_filed_yn",
      label: "Has a civil lawsuit been filed against anyone in relation to this incident?",
      input_options: YES_NO,
      synthetic: true,
    },
    {
      field_key: "ardc_no",
      label: "Civil attorney ARDC No.",
      help_text: "If a civil lawsuit has been filed, list the ARDC number of the lawyer handling the suit.",
    },
  ],

  // --------- Section 3 — Losses Claimed (page 6) ---------
  // 28-checkbox grid. The PDF widgets are unnamed `Check Box NN` rows, so
  // we insert synthetic checkboxes instead of trying to correlate widgets
  // by (page, x, y). Answers live at these synthetic field_keys.
  losses_claimed: [
    { field_key: "loss_medical_hospital", label: "Medical / Hospital", field_type: "checkbox", synthetic: true },
    { field_key: "loss_dental", label: "Dental", field_type: "checkbox", synthetic: true },
    { field_key: "loss_transportation", label: "Transportation", field_type: "checkbox", synthetic: true },
    { field_key: "loss_accessibility_costs", label: "Accessibility Costs", field_type: "checkbox", synthetic: true },
    { field_key: "loss_crime_scene_cleanup", label: "Crime Scene Cleanup", field_type: "checkbox", synthetic: true },
    {
      field_key: "loss_counseling",
      label: "Counseling",
      field_type: "checkbox",
      help_text:
        "Must be provided by a psychiatrist, licensed clinical psychologist, licensed clinical social worker, licensed clinical professional counselor, or Christian Science practitioner/nurse.",
      synthetic: true,
    },
    { field_key: "loss_relocation_costs", label: "Relocation Costs", field_type: "checkbox", synthetic: true },
    { field_key: "loss_temporary_lodging", label: "Temporary Lodging", field_type: "checkbox", synthetic: true },
    {
      field_key: "loss_tattoo_removal",
      label: "Tattoo Removal",
      field_type: "checkbox",
      help_text: "Available for victims of Human Trafficking only.",
      synthetic: true,
    },
    { field_key: "loss_loss_of_earnings", label: "Loss of Earnings", field_type: "checkbox", synthetic: true },
    { field_key: "loss_tuition", label: "Tuition", field_type: "checkbox", synthetic: true },
    { field_key: "loss_replacement_service_loss", label: "Replacement Service Loss", field_type: "checkbox", synthetic: true },
    { field_key: "loss_locks", label: "Locks", field_type: "checkbox", synthetic: true },
    { field_key: "loss_windows", label: "Windows", field_type: "checkbox", synthetic: true },
    { field_key: "loss_clothing", label: "Clothing", field_type: "checkbox", synthetic: true },
    { field_key: "loss_bedding", label: "Bedding", field_type: "checkbox", synthetic: true },
    { field_key: "loss_prosthetic_appliances", label: "Prosthetic Appliances", field_type: "checkbox", synthetic: true },
    { field_key: "loss_eyeglasses_contacts", label: "Eyeglasses / Contacts", field_type: "checkbox", synthetic: true },
    { field_key: "loss_hearing_aids", label: "Hearing Aids", field_type: "checkbox", synthetic: true },
    { field_key: "loss_replacement_costs", label: "Replacement Costs", field_type: "checkbox", synthetic: true },
    { field_key: "loss_loss_of_support", label: "Loss of Support", field_type: "checkbox", synthetic: true },
    { field_key: "loss_towing_and_storage", label: "Towing and Storage", field_type: "checkbox", synthetic: true },
    { field_key: "loss_funeral_burial", label: "Funeral / Burial", field_type: "checkbox", synthetic: true },
    { field_key: "loss_loss_of_future_earnings", label: "Loss of Future Earnings", field_type: "checkbox", synthetic: true },
    { field_key: "loss_legal_fees", label: "Legal Fees", field_type: "checkbox", synthetic: true },
    { field_key: "loss_doors", label: "Doors", field_type: "checkbox", synthetic: true },
    { field_key: "loss_funeral_cremation", label: "Funeral / Cremation", field_type: "checkbox", synthetic: true },
    { field_key: "loss_dependent_replacement_service_loss", label: "Dependent Replacement Service Loss", field_type: "checkbox", synthetic: true },
    { field_key: "loss_headstone", label: "Headstone", field_type: "checkbox", synthetic: true },
  ],

  // --------- Section 4 — Medical Information (page 7) ---------
  medical: [
    // Provider table — 5 rows × 5 columns. 4 of 5 columns carry semantic
    // field_keys; the "Medical Provider" name column lives in unnamed
    // Text widgets (Tier C).
    { field_key: "provider_1_name", label: "Provider 1 — Name", synthetic: true },
    { field_key: "city_row1", label: "Provider 1 — City" },
    { field_key: "provider_phone_no_row1", label: "Provider 1 — Phone" },
    { field_key: "dates_of_services_row1", label: "Provider 1 — Date(s) of Service" },
    { field_key: "amount_of_bill_row1", label: "Provider 1 — Amount of Bill", field_type: "currency" },
    { field_key: "provider_2_name", label: "Provider 2 — Name", synthetic: true },
    { field_key: "city_row2", label: "Provider 2 — City" },
    { field_key: "provider_phone_no_row2", label: "Provider 2 — Phone" },
    { field_key: "dates_of_services_row2", label: "Provider 2 — Date(s) of Service" },
    { field_key: "amount_of_bill_row2", label: "Provider 2 — Amount of Bill", field_type: "currency" },
    { field_key: "provider_3_name", label: "Provider 3 — Name", synthetic: true },
    { field_key: "city_row3", label: "Provider 3 — City" },
    { field_key: "provider_phone_no_row3", label: "Provider 3 — Phone" },
    { field_key: "dates_of_services_row3", label: "Provider 3 — Date(s) of Service" },
    { field_key: "amount_of_bill_row3", label: "Provider 3 — Amount of Bill", field_type: "currency" },
    { field_key: "provider_4_name", label: "Provider 4 — Name", synthetic: true },
    { field_key: "city_row4", label: "Provider 4 — City" },
    { field_key: "provider_phone_no_row4", label: "Provider 4 — Phone" },
    { field_key: "dates_of_services_row4", label: "Provider 4 — Date(s) of Service" },
    { field_key: "amount_of_bill_row4", label: "Provider 4 — Amount of Bill", field_type: "currency" },
    { field_key: "provider_5_name", label: "Provider 5 — Name", synthetic: true },
    { field_key: "city_row5", label: "Provider 5 — City" },
    { field_key: "provider_phone_no_row5", label: "Provider 5 — Phone" },
    { field_key: "dates_of_services_row5", label: "Provider 5 — Date(s) of Service" },
    { field_key: "amount_of_bill_row5", label: "Provider 5 — Amount of Bill", field_type: "currency" },
    // Collateral source policy/ID# fields — the PDF question is Yes/No,
    // followed by policy/ID inputs for each source.
    {
      field_key: "insurance_and_other_collateral_sources_yn",
      label: "Do you have insurance or other collateral sources?",
      input_options: YES_NO,
      help_text:
        "Crime Victims Compensation reimburses after all other sources are exhausted. If yes, enter policy and ID# for each applicable source below.",
      synthetic: true,
    },
    { field_key: "medicare", label: "Medicare — Policy / ID#" },
    { field_key: "insurance", label: "Medical Insurance — Policy / ID#" },
    { field_key: "union_insurance", label: "Union Insurance — Policy / ID#" },
    { field_key: "vision_dental_insurance_etc", label: "Vision / Dental Insurance — Policy / ID#" },
    { field_key: "veterans_administration", label: "Veterans Administration — Policy / ID#" },
    { field_key: "ssi_or_ssdi", label: "SSI or SSDI — Policy / ID#" },
    { field_key: "auto_insurance", label: "Auto Insurance — Policy / ID#" },
    { field_key: "other_litigation", label: "Proceeds of Personal Injury or Other Litigation" },
    { field_key: "discount", label: "Hospital Uninsured Patient Discount" },
  ],

  // --------- Section 5 — Employment Information (pages 7-8) ---------
  employment: [
    {
      field_key: "applying_loss_of_earnings_yn",
      label: "Are you applying for loss of earnings due to the crime?",
      input_options: YES_NO,
      synthetic: true,
    },
    {
      field_key: "employers",
      label: "Employment History (past 6 months)",
      field_type: "repeating_rows",
      synthetic: true,
      input_options: {
        columns: [
          { fieldKey: "name", label: "Employer Name", fieldType: "text" },
          { fieldKey: "address", label: "Employer's Address", fieldType: "text" },
          { fieldKey: "phone", label: "Employer's Phone", fieldType: "phone" },
          {
            fieldKey: "net_monthly_wages",
            label: "Net Monthly Wages (Take Home Pay)",
            fieldType: "currency",
          },
        ],
        minRows: 1,
        maxRows: 3,
      },
    },
    {
      field_key: "received_work_benefits_yn",
      label: "Did you receive sick, vacation, personal time, or disability benefits from work after the crime?",
      input_options: YES_NO,
      synthetic: true,
    },
    {
      field_key: "employment_benefits",
      label: "Benefits Received After the Crime",
      field_type: "repeating_rows",
      synthetic: true,
      help_text:
        "Include: Sick, Vacation, Personal, Disability, Other, Death Benefit (City of Chicago Fund), Life/Health/Accident/Vehicle insurance, Unemployment, Veterans/Social Security Burial, Workers Compensation, Federal Medicare/State Public Aid.",
      input_options: {
        columns: [
          { fieldKey: "type", label: "Type of Benefit", fieldType: "text" },
          { fieldKey: "amount", label: "Amount", fieldType: "currency" },
        ],
        minRows: 3,
        maxRows: 11,
      },
    },
  ],

  // --------- Section 6 — Funeral & Burial (pages 8-9) ---------
  funeral: [
    {
      field_key: "funeral_home_name",
      label: "Name of Funeral Home",
      synthetic: true,
    },
    {
      field_key: "funeral_home_phone",
      label: "Funeral Home Phone Number",
      synthetic: true,
    },
    {
      field_key: "funeral_total_amount",
      label: "Total Amount of Funeral Bill",
      field_type: "currency",
      synthetic: true,
    },
    {
      field_key: "funeral_payers",
      label: "Who Has Paid for Funeral Expenses",
      field_type: "repeating_rows",
      synthetic: true,
      input_options: {
        columns: [
          { fieldKey: "name", label: "Name of Person Who Paid", fieldType: "text" },
          { fieldKey: "relationship", label: "Relationship to Victim", fieldType: "text" },
          { fieldKey: "amount", label: "Amount", fieldType: "currency" },
        ],
        minRows: 1,
        maxRows: 5,
      },
    },
    { field_key: "cemetery_name", label: "Name of Cemetery", synthetic: true },
    { field_key: "cemetery_phone", label: "Cemetery Phone Number", synthetic: true },
    {
      field_key: "cemetery_total_amount",
      label: "Total Amount of Cemetery Bill",
      field_type: "currency",
      synthetic: true,
    },
    {
      field_key: "funeral_cemetery_total",
      label: "Total Amount of Funeral / Cemetery Expenses",
      field_type: "currency",
      synthetic: true,
    },
    {
      field_key: "victim_had_life_insurance_yn",
      label: "Did the victim have a life insurance policy?",
      input_options: YES_NO,
      synthetic: true,
    },
    {
      field_key: "victim_employed_before_crime_yn",
      label: "Was the victim employed during the six (6) months before the crime?",
      input_options: YES_NO,
      synthetic: true,
    },
  ],

  // --------- Section 7 — Certification (page 10) ---------
  // The page renderer treats this section specially: it shows a per-section
  // review, the three certification inputs below, auto-stamped signing date,
  // and the Submit + Download buttons. The intakeV2Service stamps signed_at
  // the first time all three fields are filled.
  certification: [
    {
      field_key: "cert_subrogation_acknowledged",
      label:
        "I have read and agree to the Acknowledgement of Subrogation. I understand that if I receive money from another source (offender, civil suit, insurance), I will repay the Crime Victims Compensation Program.",
      field_type: "checkbox",
      synthetic: true,
      required: true,
    },
    {
      field_key: "cert_release_authorized",
      label:
        "I authorize the Illinois Attorney General's Office to request medical, financial, and other records necessary to process my claim (Release of Information).",
      field_type: "checkbox",
      synthetic: true,
      required: true,
    },
    {
      field_key: "cert_typed_signature",
      label: "Applicant's Full Name (typed signature)",
      help_text:
        "Typing your full legal name here acts as your electronic signature. The date is recorded automatically when you sign.",
      synthetic: true,
      required: true,
    },
  ],
};

// -----------------------------------------------------------------------------
// Driver
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
  const supabase = getSupabaseAdmin();

  // Load existing rows so we can distinguish insert from update and report unknowns.
  const { data: rows, error: readErr } = await supabase
    .from("cvc_form_fields")
    .select("id, field_key")
    .eq("template_id", TEMPLATE_ID);
  if (readErr) throw new Error(`read cvc_form_fields: ${readErr.message}`);
  const dbByKey = new Map<string, { id: string }>();
  for (const r of (rows ?? []) as Array<{ id: string; field_key: string }>) {
    dbByKey.set(r.field_key, { id: r.id });
  }
  console.log(`[seed] loaded ${dbByKey.size} existing rows for template ${TEMPLATE_ID}`);

  // Step 1 — reset every existing row to hidden + null section. Overrides
  // below reactivate the curated subset.
  const { error: resetErr } = await supabase
    .from("cvc_form_fields")
    .update({ is_visible_to_applicant: false, section_key: null, display_order: null })
    .eq("template_id", TEMPLATE_ID);
  if (resetErr) throw new Error(`reset visibility: ${resetErr.message}`);
  console.log(`[seed] reset ${dbByKey.size} rows to hidden`);

  // Step 2 — upsert each spec.
  let updated = 0;
  let inserted = 0;
  const sectionCounts: Record<string, number> = {};

  for (const [section, fields] of Object.entries(SECTIONS) as Array<[
    SectionKey,
    FieldSpec[],
  ]>) {
    sectionCounts[section] = 0;
    for (let i = 0; i < fields.length; i += 1) {
      const f = fields[i];
      const fieldType: FieldType = f.field_type ?? "text";
      const payload = {
        template_id: TEMPLATE_ID,
        field_key: f.field_key,
        label: f.label,
        field_type: fieldType,
        section_key: section,
        display_order: i,
        help_text: f.help_text ?? null,
        input_options: f.input_options ?? null,
        is_visible_to_applicant: true,
        is_readonly: false,
        // Synthetic rows carry a marker so future re-ingestions leave them alone.
        source_path: f.synthetic ? `synthetic:${f.field_key}` : undefined,
      };
      const existing = dbByKey.get(f.field_key);
      if (existing) {
        // Strip nulls we don't want to overwrite on update (source_path for
        // PDF-derived rows is the AcroForm name — keep it).
        const updatePayload: Record<string, unknown> = {
          label: payload.label,
          field_type: payload.field_type,
          section_key: payload.section_key,
          display_order: payload.display_order,
          help_text: payload.help_text,
          input_options: payload.input_options,
          is_visible_to_applicant: true,
          required: f.required === true,
        };
        if (f.synthetic) updatePayload.source_path = payload.source_path;
        const { error } = await supabase
          .from("cvc_form_fields")
          .update(updatePayload)
          .eq("id", existing.id);
        if (error) {
          console.warn(`[seed] update failed for ${f.field_key}: ${error.message}`);
          continue;
        }
        updated += 1;
      } else {
        const { error } = await supabase.from("cvc_form_fields").insert({
          ...payload,
          page_number: null,
          required: f.required === true,
        });
        if (error) {
          console.warn(`[seed] insert failed for ${f.field_key}: ${error.message}`);
          continue;
        }
        inserted += 1;
      }
      sectionCounts[section] += 1;
    }
  }

  const visible = updated + inserted;
  console.log("\n[seed] ===== Summary =====");
  console.log(`  Updated:    ${updated}`);
  console.log(`  Inserted:   ${inserted}  (synthetic consolidated fields)`);
  console.log(`  Visible:    ${visible}`);
  console.log(`  Hidden:     ${dbByKey.size - updated}  (PDF widgets with no override)`);
  console.log(`  Per section:`);
  for (const [s, n] of Object.entries(sectionCounts)) {
    console.log(`    ${s.padEnd(18)} ${n}`);
  }
}

main()
  .then(() => {
    console.log("[seed] done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[seed] fatal: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
