"use client";

const STORAGE_PREFIXES = [
  "nxtstps_compensation_intake_v1",
  "nxtstps_active_case_",
  "nxtstps_intake_progress_",
];

const STORAGE_KEYS = [
  "nxtstps_lang",
  "nxtstps_selected_state",
  "nxtstps_docs_v1",
];

export function clearSensitiveLocalState(userId?: string | null) {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];

  try {
    for (const k of STORAGE_KEYS) keysToRemove.push(k);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (STORAGE_PREFIXES.some((p) => key.startsWith(p))) keysToRemove.push(key);
      if (userId && (key === `nxtstps_active_case_${userId}` || key === `nxtstps_intake_progress_${userId}`)) {
        keysToRemove.push(key);
      }
    }
  } catch {
    // ignore
  }

  try {
    for (const key of Array.from(new Set(keysToRemove))) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  } catch {}
}

