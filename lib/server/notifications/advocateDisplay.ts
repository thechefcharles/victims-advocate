import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  advocateWelcomeDisplayName,
  parseAdvocatePersonalInfo,
} from "@/lib/personalInfo";

export async function getAdvocateDisplayForNotification(userId: string): Promise<{
  displayName: string;
  email: string | null;
}> {
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, personal_info")
    .eq("id", userId)
    .maybeSingle();

  const email =
    typeof profile?.email === "string" && profile.email.trim()
      ? profile.email.trim()
      : null;
  const adv = parseAdvocatePersonalInfo(profile?.personal_info ?? null);
  const displayName = advocateWelcomeDisplayName(adv) || email || "Advocate";
  return { displayName, email };
}
