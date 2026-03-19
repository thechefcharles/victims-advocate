/**
 * Aggregate victim (case owner) identities for all cases belonging to an organization.
 */

import { listCasesForOrganization } from "@/lib/server/data";
import type { CaseRow } from "@/lib/server/data";

function victimDisplayName(application: unknown): string {
  if (application == null || typeof application !== "object") return "Unknown";
  const v = (application as Record<string, unknown>).victim as Record<string, unknown> | undefined;
  if (!v) return "Unknown";
  const first = (v.firstName as string) ?? "";
  const last = (v.lastName as string) ?? "";
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || "Unknown";
}

export type OrgVictimCaseRef = {
  id: string;
  status: string;
  created_at: string;
};

export type OrgVictimSummary = {
  victim_user_id: string;
  display_name: string;
  case_count: number;
  cases: OrgVictimCaseRef[];
};

export async function listVictimsForOrganization(params: {
  organizationId: string;
}): Promise<OrgVictimSummary[]> {
  const rows = await listCasesForOrganization(params);
  const byOwner = new Map<
    string,
    { display_name: string; cases: OrgVictimCaseRef[] }
  >();

  for (const raw of rows) {
    const c = raw as CaseRow;
    const owner = c.owner_user_id as string | undefined;
    if (!owner) continue;

    const name = victimDisplayName(c.application);
    const id = String(c.id ?? "");
    const status = String(c.status ?? "");
    const created_at = String(c.created_at ?? "");

    const ref: OrgVictimCaseRef = { id, status, created_at };
    const cur = byOwner.get(owner) ?? { display_name: "Unknown", cases: [] };
    cur.cases.push(ref);
    if (name !== "Unknown") cur.display_name = name;
    byOwner.set(owner, cur);
  }

  const summaries: OrgVictimSummary[] = [];
  for (const [victim_user_id, v] of byOwner) {
    v.cases.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return tb - ta;
    });
    summaries.push({
      victim_user_id,
      display_name: v.display_name,
      case_count: v.cases.length,
      cases: v.cases,
    });
  }

  summaries.sort((a, b) => a.display_name.localeCompare(b.display_name));
  return summaries;
}
