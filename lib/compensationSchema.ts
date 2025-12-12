// lib/compensationSchema.ts

// SECTION 1 – Victim & Applicant Info
export interface VictimInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // "YYYY-MM-DD"
  streetAddress: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  email?: string;
  cellPhone?: string;
  alternatePhone?: string;
  workPhone?: string;
  genderIdentity?: string;
  maritalStatus?: string;
  race?: string;
  ethnicity?: string;
  hasDisability?: boolean;
  disabilityType?: "physical" | "mental" | "developmental" | "other" | null;
}

export interface ApplicantInfo {
  isSameAsVictim: boolean;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  streetAddress?: string;
  apt?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  cellPhone?: string;
  alternatePhone?: string;
  workPhone?: string;
  relationshipToVictim?: string;
  seekingOwnExpenses?: boolean;
  descriptionOfExpensesSought?: string;
  hasLegalGuardianship?: boolean; // for minor/incapacitated victims
}

export interface AdvocateContact {
  prefersEnglish: boolean;
  preferredLanguage?: string;
  workingWithAdvocate: boolean;
  advocateName?: string;
  advocatePhone?: string;
  advocateOrganization?: string;
  advocateEmail?: string;
  consentToTalkToAdvocate?: boolean;
  alternateContactName?: string;
  alternateContactPhone?: string;
  alternateContactRelationship?: string;
}

// SECTION 2 – Crime & Court Info
export interface CrimeInfo {
  policeReportNumber?: string;
  dateOfCrime: string;
  dateReported: string;
  crimeAddress: string;
  crimeCity: string;
  crimeCounty: string;
  reportingAgency: string;
  crimeDescription: string;
  injuryDescription: string;
  offenderKnown: boolean;
  offenderNames?: string;
  offenderRelationship?: string;
  sexualAssaultKitPerformed?: boolean;
}

export interface CourtInfo {
  offenderArrested?: boolean | null;
  offenderCharged?: boolean | null;
  applicantTestified?: boolean | null;
  criminalCaseOutcome?: string;
  criminalCaseNumber?: string;
  restitutionOrdered?: boolean | null;
  restitutionAmount?: number;
  humanTraffickingCaseFiled?: boolean | null;
  humanTraffickingCaseOutcome?: string;
  humanTraffickingCaseNumber?: string;
}

export interface ProtectionAndCivilInfo {
  involvesUseOfForceByLawEnforcement?: boolean | null;
  useOfForceProceedingsDescription?: string;

  hasOrderOfProtection?: boolean | null;
  orderNumber?: string;
  orderIssueDate?: string;
  orderExpirationDate?: string;

  supplementalDocsProvided?: boolean | null;
  supplementalDocsDescription?: string;

  civilLawsuitFiled?: boolean | null;
  civilAttorneyName?: string;
  civilAttorneyEmail?: string;
  civilAttorneyPhone?: string;
  civilAttorneyArdc?: string;
}

// SECTION 3 – Losses claimed
export interface LossesClaimed {
  medicalHospital: boolean;
  dental: boolean;
  transportation: boolean;
  accessibilityCosts: boolean;
  crimeSceneCleanup: boolean;
  counseling: boolean;
  relocationCosts: boolean;
  temporaryLodging: boolean;
  tattooRemoval: boolean;
  lossOfEarnings: boolean;
  tuition: boolean;
  replacementServiceLoss: boolean;
  locks: boolean;
  windows: boolean;
  clothing: boolean;
  bedding: boolean;
  prostheticAppliances: boolean;
  eyeglassesContacts: boolean;
  hearingAids: boolean;
  replacementCosts: boolean;
  lossOfSupport: boolean;
  towingStorage: boolean;
  funeralBurial: boolean;
  lossOfFutureEarnings: boolean;
  legalFees: boolean;
  doors: boolean;
  headstone: boolean;
}

// SECTION 4 – Medical info
export interface MedicalProvider {
  providerName: string;
  city?: string;
  phone?: string;
  serviceDates?: string;
  amountOfBill?: number;
}

export interface MedicalInfo {
  providers: MedicalProvider[];
  hasOtherSources?: boolean;
  medicalCard?: string;
  medicare?: string;
  medicalInsurance?: string;
  unionInsurance?: string;
  dentalVisionInsurance?: string;
  workersComp?: string;
  veteransAdmin?: string;
  ssiSsdi?: string;
  autoInsurance?: string;
  otherInsuranceDescription?: string;
}

// SECTION 5 – Employment
export interface EmploymentRecord {
  employerName: string;
  employerAddress?: string;
  employerPhone?: string;
  netMonthlyWages?: number;
}

export interface EmploymentInfo {
  isApplyingForLossOfEarnings: boolean;
  employmentHistory: EmploymentRecord[];
  receivedSickOrVacationOrDisability?: boolean;
  benefitNotes?: string; // e.g. "2 weeks sick pay, 3 days vacation"
}

// SECTION 6 – Funeral (simplified)
export interface FuneralPayment {
  payerName: string;
  relationshipToVictim?: string;
  amountPaid: number;
}

export interface Dependent {
  name: string;
  relationshipToVictim?: string;
  dateOfBirth?: string; // "YYYY-MM-DD"
  guardianNamePhone?: string;
}

export interface FuneralInfo {
  funeralHomeName?: string;
  funeralHomePhone?: string;
  funeralBillTotal?: number;
  payments: FuneralPayment[];

  // Cemetery
  cemeteryName?: string;
  cemeteryPhone?: string;
  cemeteryBillTotal?: number;

  // Chicago ESVF (funeral fund)
  receivedChicagoESVF?: boolean;
  esvfAmount?: number;

  // Life insurance / death benefits
  lifeInsurancePolicyExists?: boolean;
  lifeInsuranceCompany?: string;
  lifeInsuranceBeneficiary?: string;
  lifeInsuranceBeneficiaryPhone?: string;
  lifeInsuranceAmountPaid?: number;

  // Loss of support dependents
  dependents?: Dependent[];
}

export interface CertificationInfo {
  acknowledgesSubrogation?: boolean;
  acknowledgesRelease?: boolean;
  acknowledgesPerjury?: boolean;

  applicantSignatureName?: string;
  applicantSignatureDate?: string; // "YYYY-MM-DD"

  representedByAttorney?: boolean;
  attorneyName?: string;
  attorneyArdc?: string;
  attorneyAddress?: string;
  attorneyCity?: string;
  attorneyState?: string;
  attorneyZip?: string;
  attorneyPhone?: string;
  attorneyEmail?: string;
}

// Top-level application object
export interface CompensationApplication {
  victim: VictimInfo;
  applicant: ApplicantInfo;
  contact: AdvocateContact;
  crime: CrimeInfo;
  court: CourtInfo;
  protectionAndCivil: ProtectionAndCivilInfo;
  losses: LossesClaimed;
  medical: MedicalInfo;
  employment: EmploymentInfo;
  funeral: FuneralInfo;
  certification: CertificationInfo;
}