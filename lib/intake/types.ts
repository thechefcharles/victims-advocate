// lib/intake/types.ts
export type ISODate = string; // "YYYY-MM-DD"

export type VictimSection = {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: ISODate;
  phone?: string;
  email?: string;

  address1: string;
  address2?: string; // apt/unit
  city: string;
  state: string;
  zip: string;
  county?: string;

  genderIdentity?: string;
  race?: string;
  ethnicity?: string;

  hasDisability?: "yes" | "no" | "unknown";
  disabilityTypes?: {
    physical?: boolean;
    mental?: boolean;
    developmental?: boolean;
    other?: boolean;
    otherText?: string;
  };
};

export type ApplicantSection = {
  isVictimAlsoApplicant: "yes" | "no";
  relationshipToVictim?: string;

  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: ISODate;

  phone?: string;
  email?: string;

  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
};

export type CrimeSection = {
  incidentDate?: ISODate;
  incidentTime?: string; // keep simple initially
  locationAddress?: string;
  locationCity?: string;
  locationState?: string;
  locationZip?: string;

  policeReported?: "yes" | "no" | "unknown";
  policeDepartment?: string;
  policeReportNumber?: string;

  offenderKnown?: "yes" | "no" | "unknown";
  offenderName?: string;

  narrative?: string; // trauma-informed short description
};

export type LossesSection = {
  // what categories are being requested
  wantsMedical?: boolean;
  wantsCounseling?: boolean;
  wantsLostWages?: boolean;
  wantsFuneral?: boolean;
  wantsPropertyLoss?: boolean;
  wantsRelocation?: boolean;
  wantsOther?: boolean;
  otherDescription?: string;

  // quick estimates (optional)
  estimatedTotal?: number;
};

export type MedicalSection = {
  hasMedicalTreatment?: "yes" | "no" | "unknown";
  hospitalName?: string;
  hospitalCity?: string;
  treatmentStart?: ISODate;
  treatmentEnd?: ISODate;

  counseling?: {
    hasCounseling?: "yes" | "no" | "unknown";
    providerName?: string;
    sessionsCount?: number;
  };
};

export type EmploymentSection = {
  employedAtTime?: "yes" | "no" | "unknown";
  employerName?: string;
  employerPhone?: string;
  employerAddress?: string;

  missedWork?: "yes" | "no" | "unknown";
  missedWorkFrom?: ISODate;
  missedWorkTo?: ISODate;

  disabilityFromCrime?: "yes" | "no" | "unknown";
};

export type FuneralSection = {
  victimDeceased?: "yes" | "no" | "unknown";
  funeralHomeName?: string;
  funeralHomePhone?: string;

  dependents?: {
    hasDependents?: "yes" | "no" | "unknown";
    count?: number;
    notes?: string;
  };
};

export type DocumentsChecklist = {
  policeReport?: boolean;
  medicalBills?: boolean;
  counselingBills?: boolean;
  funeralInvoices?: boolean;
  wageProof?: boolean;
  idProof?: boolean;
  otherDocs?: { label?: string; uploaded?: boolean }[];
};

export type DocumentsSection = {
  checklist?: DocumentsChecklist;

  uploads: {
    policeReport?: { storagePath: string; fileName: string }[];
    medicalBills?: { storagePath: string; fileName: string }[];
    counselingBills?: { storagePath: string; fileName: string }[];
    funeralBills?: { storagePath: string; fileName: string }[];
    wageProof?: { storagePath: string; fileName: string }[];
    other?: { storagePath: string; fileName: string }[];
  };

  notes?: string;
};

export type CaseData = {
  victim: VictimSection;
  applicant: ApplicantSection;
  crime: CrimeSection;
  losses: LossesSection;
  medical: MedicalSection;
  employment: EmploymentSection;
  funeral: FuneralSection;
  documents: DocumentsSection;

  // meta
  lastSavedAt?: string;
  completedSteps?: Record<string, boolean>;
};