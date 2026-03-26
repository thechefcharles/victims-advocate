import { redirect } from "next/navigation";
import { getSupabaseAuthServer } from "@/lib/supabaseAuthServer";

/**
 * Legacy URL: signed-out users join the main person-first signup with Organization Leader selected;
 * signed-in users go through /dashboard (verify, consent, role-based routing) instead of a second signup.
 */
export default async function OrganizationSignupRedirectPage() {
  const supabase = await getSupabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }
  redirect("/signup?intent=organization");
}
