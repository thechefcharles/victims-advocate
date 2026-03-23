import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { parsePersonalInfo, type VictimPersonalInfo } from "@/lib/personalInfo";

export async function getPersonalInfoForUserId(userId: string): Promise<VictimPersonalInfo> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("personal_info")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Profile lookup failed", undefined, 500);
  }
  return parsePersonalInfo(data?.personal_info);
}
