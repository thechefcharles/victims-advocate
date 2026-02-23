// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Check .env.local for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Wrap fetch in the browser to handle token-refresh "Failed to fetch" without spamming console
function createSupabaseFetch(): typeof fetch {
  if (typeof window === "undefined") return fetch;

  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : "";
  let lastLogged = 0;
  const LOG_THROTTLE_MS = 10000; // Only log once per 10 seconds

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      return await fetch(input, init);
    } catch (err: unknown) {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const isSupabaseAuth =
        supabaseHost && url.includes(supabaseHost) && url.includes("/auth/v1/");
      const isNetworkError =
        err instanceof TypeError && (err.message === "Failed to fetch" || err.message === "Load failed");

      if (isSupabaseAuth && isNetworkError && Date.now() - lastLogged > LOG_THROTTLE_MS) {
        lastLogged = Date.now();
        console.warn(
          "[Supabase] Token refresh failed (network error). " +
            "Check your connection and .env.local (NEXT_PUBLIC_SUPABASE_URL). " +
            "You may need to log in again."
        );
      }
      throw err;
    }
  };
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    ...(typeof window !== "undefined" && {
      global: { fetch: createSupabaseFetch() },
    }),
  }
);