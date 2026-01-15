// lib/intake/api.ts
import type { CaseData } from "./types";

/**
 * Load a case draft from the API
 */
export async function loadCaseDraft(caseId: string): Promise<CaseData> {
  const res = await fetch(`/api/cases/${caseId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to load case draft");
  }

  const json = await res.json();
  return json.data as CaseData;
}

/**
 * Save (patch) a case draft to the API
 */
export async function saveCaseDraft(
  caseId: string,
  patch: Partial<CaseData>
): Promise<void> {
  const res = await fetch(`/api/cases/${caseId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    throw new Error("Failed to save case draft");
  }
}