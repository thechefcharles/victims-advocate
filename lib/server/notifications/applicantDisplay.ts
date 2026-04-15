import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getPersonalInfoForUserId } from "@/lib/server/profile/getPersonalInfo";

/**
 * Display strings for in-app notifications when an applicant initiates contact (e.g. advocate connection).
 */
export async function getApplicantDisplayForNotification(applicantUserId: string): Promise<{
  displayName: string;
  email: string | null;
}> {
  let nameFromProfile: string | null = null;
  try {
    const pi = await getPersonalInfoForUserId(applicantUserId);
    const preferred = pi.preferred_name?.trim() ?? "";
    const legalFirst = pi.legal_first_name?.trim() ?? "";
    const legalLast = pi.legal_last_name?.trim() ?? "";
    const legal = [legalFirst, legalLast].filter(Boolean).join(" ").trim();
    nameFromProfile = preferred || legal || null;
  } catch {
    // Profile optional; fall back to email.
  }

  const supabase = getSupabaseAdmin();
  const { data: u } = await supabase.auth.admin.getUserById(applicantUserId);
  const email = u?.user?.email ?? null;

  const displayName =
    nameFromProfile || (email ? (email.split("@")[0] ?? "").trim() : "") || "Applicant";

  return { displayName, email };
}
