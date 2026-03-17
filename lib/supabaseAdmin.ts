// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";

export function getSupabaseAdmin() {
  const { url, serviceRoleKey } = config.supabase;
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}