/**
 * Victim account personal information (stored in profiles.personal_info).
 * No SSN or tax IDs.
 */
import { z } from "zod";

export const EDUCATION_LEVELS = [
  "",
  "less_than_hs",
  "hs_ged",
  "some_college",
  "associates",
  "bachelors",
  "graduate",
  "prefer_not",
] as const;

export const CONTACT_METHODS = ["", "email", "phone", "sms"] as const;

const str = z
  .string()
  .max(500)
  .optional()
  .nullable()
  .transform((s) => (s == null || s === "" ? null : s.trim()));

const strShort = z
  .string()
  .max(200)
  .optional()
  .nullable()
  .transform((s) => (s == null || s === "" ? null : s.trim()));

const dob = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((s) => (s === "" || s == null ? null : s));

export const personalInfoPatchSchema = z
  .object({
    preferred_name: strShort,
    legal_first_name: strShort,
    legal_last_name: strShort,
    pronouns: strShort,
    gender_identity: strShort,
    date_of_birth: dob,
    ethnicity: strShort,
    race: strShort,
    street_address: str,
    apt: strShort,
    city: strShort,
    state: z
      .string()
      .max(2)
      .optional()
      .nullable()
      .transform((s) => (s == null || s === "" ? null : s.trim().toUpperCase())),
    zip: z
      .string()
      .max(12)
      .optional()
      .nullable()
      .transform((s) => (s == null || s === "" ? null : s.trim())),
    cell_phone: strShort,
    alternate_phone: strShort,
    occupation: strShort,
    education_level: z
      .string()
      .max(32)
      .optional()
      .nullable()
      .transform((s) => (s == null || s === "" ? null : s)),
    primary_language: strShort,
    interpreter_needed: z.union([z.boolean(), z.null()]).optional(),
    preferred_contact_method: z
      .string()
      .max(16)
      .optional()
      .nullable()
      .transform((s) => (s == null || s === "" ? null : s)),
    safe_to_leave_voicemail: z.union([z.boolean(), z.null()]).optional(),
    disability_or_access_needs: str,
  })
  .strict();

export type PersonalInfoPatch = z.infer<typeof personalInfoPatchSchema>;

export type VictimPersonalInfo = {
  preferred_name?: string | null;
  legal_first_name?: string | null;
  legal_last_name?: string | null;
  pronouns?: string | null;
  gender_identity?: string | null;
  date_of_birth?: string | null;
  ethnicity?: string | null;
  race?: string | null;
  street_address?: string | null;
  apt?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  cell_phone?: string | null;
  alternate_phone?: string | null;
  occupation?: string | null;
  education_level?: string | null;
  primary_language?: string | null;
  interpreter_needed?: boolean | null;
  preferred_contact_method?: (typeof CONTACT_METHODS)[number] | null;
  safe_to_leave_voicemail?: boolean | null;
  disability_or_access_needs?: string | null;
};

export function parsePersonalInfo(raw: unknown): VictimPersonalInfo {
  if (!raw || typeof raw !== "object") return {};
  return raw as VictimPersonalInfo;
}

export function mergePersonalInfo(
  existing: unknown,
  patch: PersonalInfoPatch
): VictimPersonalInfo {
  const base = parsePersonalInfo(existing);
  const out: VictimPersonalInfo = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Preferred name or both legal names — enough to address someone personally. */
export function victimHasDisplayName(info: VictimPersonalInfo | null): boolean {
  const p = parsePersonalInfo(info);
  if (p.preferred_name?.trim()) return true;
  if (p.legal_first_name?.trim() && p.legal_last_name?.trim()) return true;
  return false;
}

/**
 * Name + at least one phone + city — minimum for advocates/orgs to reach the applicant.
 */
export function victimProfileCompleteEnough(info: VictimPersonalInfo | null): boolean {
  if (!victimHasDisplayName(info)) return false;
  const p = parsePersonalInfo(info);
  const hasPhone = !!(p.cell_phone?.trim() || p.alternate_phone?.trim());
  const hasCity = !!p.city?.trim();
  return hasPhone && hasCity;
}

/** Greeting: preferred name, else legal first+last, else single legal name. */
export function victimWelcomeDisplayName(info: VictimPersonalInfo | null): string | null {
  const p = parsePersonalInfo(info);
  if (p.preferred_name?.trim()) return p.preferred_name.trim();
  const f = p.legal_first_name?.trim();
  const l = p.legal_last_name?.trim();
  if (f && l) return `${f} ${l}`;
  if (f) return f;
  if (l) return l;
  return null;
}

// --- Advocate profile (stored at profiles.personal_info.advocate) ---

export const advocatePersonalInfoPatchSchema = z
  .object({
    preferred_name: strShort,
    legal_first_name: strShort,
    legal_last_name: strShort,
    job_title: strShort,
    work_phone: strShort,
    work_phone_ext: strShort,
    alternate_phone: strShort,
    work_city: strShort,
    work_state: z
      .string()
      .max(2)
      .optional()
      .nullable()
      .transform((s) => (s == null || s === "" ? null : s.trim().toUpperCase())),
    work_zip: strShort,
    languages: strShort,
    preferred_contact_method: z
      .string()
      .max(16)
      .optional()
      .nullable()
      .transform((s) => (s == null || s === "" ? null : s)),
    safe_to_leave_voicemail: z.union([z.boolean(), z.null()]).optional(),
  })
  .strict();

export type AdvocatePersonalInfoPatch = z.infer<typeof advocatePersonalInfoPatchSchema>;

export type AdvocatePersonalInfo = {
  preferred_name?: string | null;
  legal_first_name?: string | null;
  legal_last_name?: string | null;
  job_title?: string | null;
  work_phone?: string | null;
  work_phone_ext?: string | null;
  alternate_phone?: string | null;
  work_city?: string | null;
  work_state?: string | null;
  work_zip?: string | null;
  languages?: string | null;
  preferred_contact_method?: string | null;
  safe_to_leave_voicemail?: boolean | null;
};

/** Advocate sub-object from full profiles.personal_info JSON. */
export function parseAdvocatePersonalInfo(rawPersonalInfo: unknown): AdvocatePersonalInfo {
  if (!rawPersonalInfo || typeof rawPersonalInfo !== "object") return {};
  const adv = (rawPersonalInfo as Record<string, unknown>).advocate;
  if (!adv || typeof adv !== "object") return {};
  return adv as AdvocatePersonalInfo;
}

export function mergeAdvocateIntoPersonalInfo(
  existingPersonalInfoRow: unknown,
  patch: AdvocatePersonalInfoPatch
): Record<string, unknown> {
  const root =
    existingPersonalInfoRow && typeof existingPersonalInfoRow === "object"
      ? { ...(existingPersonalInfoRow as Record<string, unknown>) }
      : {};
  const prev = parseAdvocatePersonalInfo(root);
  const next: Record<string, unknown> = { ...prev };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    next[k] = v;
  }
  return { ...root, advocate: next };
}

export function advocateHasDisplayName(info: AdvocatePersonalInfo | null): boolean {
  const p = info ?? {};
  if (p.preferred_name?.trim()) return true;
  if (p.legal_first_name?.trim() && p.legal_last_name?.trim()) return true;
  return false;
}

/**
 * Name + work phone + (org membership OR work city) so victims and staff can reach you.
 */
export function advocateProfileCompleteEnough(
  info: AdvocatePersonalInfo | null,
  orgId: string | null
): boolean {
  if (!advocateHasDisplayName(info)) return false;
  const p = info ?? {};
  const hasPhone = !!(p.work_phone?.trim() || p.alternate_phone?.trim());
  if (!hasPhone) return false;
  if (orgId) return true;
  return !!p.work_city?.trim();
}

export function advocateWelcomeDisplayName(info: AdvocatePersonalInfo | null): string | null {
  const p = info ?? {};
  if (p.preferred_name?.trim()) return p.preferred_name.trim();
  const f = p.legal_first_name?.trim();
  const l = p.legal_last_name?.trim();
  if (f && l) return `${f} ${l}`;
  if (f) return f;
  if (l) return l;
  return null;
}
