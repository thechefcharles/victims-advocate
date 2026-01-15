import type { CaseData } from "@/lib/intake/types";

export async function fetchCase(caseId: string): Promise<CaseData> {
  const res = await fetch(`/api/cases/${caseId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load case");
  const json = await res.json();
  return json.data as CaseData;
}

export async function patchCase(caseId: string, patch: Partial<CaseData>) {
  const res = await fetch(`/api/cases/${caseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to save case");
  return res.json();
}