"use client";

import { supabase } from "@/lib/supabaseClient";
import { clearSensitiveLocalState } from "@/lib/client/safety/quickExit";

const NEUTRAL_EXIT_URL = "https://www.google.com";

/**
 * Survivor safety exit: clears tab session + app-scoped local storage, logs quick-exit when
 * authenticated (fire-and-forget), signs out locally, then replaces location — no confirmation.
 * Does not wipe unrelated browser data. See Phase 3 spec (NxtStps Cursor Rules).
 */
export function exitSafelyImmediate(opts?: { userId?: string | null; accessToken?: string | null }) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }

  clearSensitiveLocalState(opts?.userId ?? null);

  try {
    localStorage.removeItem("nxt_session_data");
  } catch {
    // ignore
  }

  const token = opts?.accessToken;
  if (token) {
    try {
      void fetch("/api/safety/quick-exit", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
      });
    } catch {
      // ignore
    }
  }

  void supabase.auth.signOut().catch(() => {});

  window.location.replace(NEUTRAL_EXIT_URL);
}
