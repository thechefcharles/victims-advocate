// lib/intake/schemas.ts
import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .or(z.literal(""));

export const victimSchema = z.object({
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  dateOfBirth: isoDate.refine((v) => v !== "", { message: "Required" }),

  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),

  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(2),
  zip: z.string().min(5),

  county: z.string().optional(),

  genderIdentity: z.string().optional(),
  race: z.string().optional(),
  ethnicity: z.string().optional(),

  hasDisability: z.enum(["yes", "no", "unknown"]).optional(),
  disabilityTypes: z
    .object({
      physical: z.boolean().optional(),
      mental: z.boolean().optional(),
      developmental: z.boolean().optional(),
      other: z.boolean().optional(),
      otherText: z.string().optional(),
    })
    .optional(),
});

export const applicantSchema = z.object({
  isVictimAlsoApplicant: z.enum(["yes", "no"]),
  relationshipToVictim: z.string().optional(),

  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: isoDate.optional(),

  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),

  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  county: z.string().optional(),
});

export const crimeSchema = z.object({
  incidentDate: isoDate.optional(),
  incidentTime: z.string().optional(),
  locationAddress: z.string().optional(),
  locationCity: z.string().optional(),
  locationState: z.string().optional(),
  locationZip: z.string().optional(),

  policeReported: z.enum(["yes", "no", "unknown"]).optional(),
  policeDepartment: z.string().optional(),
  policeReportNumber: z.string().optional(),

  offenderKnown: z.enum(["yes", "no", "unknown"]).optional(),
  offenderName: z.string().optional(),

  narrative: z.string().max(2000).optional(),
});

export const lossesSchema = z.object({
  wantsMedical: z.boolean().optional(),
  wantsCounseling: z.boolean().optional(),
  wantsLostWages: z.boolean().optional(),
  wantsFuneral: z.boolean().optional(),
  wantsPropertyLoss: z.boolean().optional(),
  wantsRelocation: z.boolean().optional(),
  wantsOther: z.boolean().optional(),
  otherDescription: z.string().optional(),
  estimatedTotal: z.number().optional(),
});

export const medicalSchema = z.object({
  hasMedicalTreatment: z.enum(["yes", "no", "unknown"]).optional(),
  hospitalName: z.string().optional(),
  hospitalCity: z.string().optional(),
  treatmentStart: isoDate.optional(),
  treatmentEnd: isoDate.optional(),

  counseling: z
    .object({
      hasCounseling: z.enum(["yes", "no", "unknown"]).optional(),
      providerName: z.string().optional(),
      sessionsCount: z.number().int().min(0).optional(),
    })
    .optional(),
});

export const employmentSchema = z.object({
  employedAtTime: z.enum(["yes", "no", "unknown"]).optional(),
  employerName: z.string().optional(),
  employerPhone: z.string().optional(),
  employerAddress: z.string().optional(),

  missedWork: z.enum(["yes", "no", "unknown"]).optional(),
  missedWorkFrom: isoDate.optional(),
  missedWorkTo: isoDate.optional(),

  disabilityFromCrime: z.enum(["yes", "no", "unknown"]).optional(),
});

export const funeralSchema = z.object({
  victimDeceased: z.enum(["yes", "no", "unknown"]).optional(),
  funeralHomeName: z.string().optional(),
  funeralHomePhone: z.string().optional(),
  dependents: z
    .object({
      hasDependents: z.enum(["yes", "no", "unknown"]).optional(),
      count: z.number().int().min(0).optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

// ✅ FIX: avoid z.record(z.any()) typing issues by explicitly modeling the uploads shape
const uploadItemSchema = z.object({
  storagePath: z.string(),
  fileName: z.string(),
});

export const documentsSchema = z.object({
  uploads: z
    .object({
      policeReport: z.array(uploadItemSchema).optional(),
      medicalBills: z.array(uploadItemSchema).optional(),
      counselingBills: z.array(uploadItemSchema).optional(),
      funeralBills: z.array(uploadItemSchema).optional(),
      wageProof: z.array(uploadItemSchema).optional(),
      other: z.array(uploadItemSchema).optional(),
    })
    .optional(),
  notes: z.string().optional(),
});