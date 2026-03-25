/**
 * Phase 5: Short, consistent labels for admin org oversight (tooltips + compact UI).
 * Keeps distinct: operational status, lifecycle, public visibility, profile stage.
 */

export function operationalStatusLabel(status: string | undefined | null): string {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "active") return "Active (operational)";
  if (s === "suspended") return "Suspended";
  if (s === "archived") return "Archived (operational)";
  return status ?? "—";
}

export function lifecycleStatusLabel(lifecycle: string | undefined | null): string {
  const s = (lifecycle ?? "").trim().toLowerCase();
  if (s === "seeded") return "Seeded — no confirmed owner yet";
  if (s === "managed") return "Managed — has org owner";
  if (s === "archived") return "Archived (lifecycle)";
  return lifecycle ?? "—";
}

export function publicProfileStatusLabel(pub: string | undefined | null): string {
  const s = (pub ?? "").trim().toLowerCase();
  if (s === "draft") return "Draft — not public";
  if (s === "pending_review") return "Pending review — activation submitted";
  if (s === "active") return "Active — public visibility on";
  if (s === "paused") return "Paused — public listing off";
  return pub ?? "—";
}

export function profileStageLabel(stage: string | undefined | null): string {
  const s = (stage ?? "").trim().toLowerCase();
  if (s === "created") return "Created — profile incomplete";
  if (s === "searchable") return "Searchable — matching-ready bar";
  if (s === "enriched") return "Enriched — extra signals";
  return stage ?? "—";
}

export type AdminOrgCueInput = {
  orgStatus: string;
  lifecycle_status?: string | null;
  public_profile_status?: string | null;
  org_owner_count?: number;
  has_pending_ownership_claim?: boolean;
  has_sensitive_profile_flag?: boolean;
};

/** One-line operational follow-up for admin org rows (non-punitive). */
export function buildAdminOrgCue(input: AdminOrgCueInput): string {
  const parts: string[] = [];
  if ((input.org_owner_count ?? 0) === 0) {
    parts.push("Needs an organization owner");
  }
  if (input.has_pending_ownership_claim) {
    parts.push("Ownership claim in queue");
  }
  if (input.public_profile_status === "pending_review") {
    parts.push("Activation review pending");
  }
  if (input.has_sensitive_profile_flag) {
    parts.push("Sensitive profile updates logged — check Audit if needed");
  }
  if (input.public_profile_status === "paused" && input.orgStatus === "active") {
    parts.push("Public listing paused");
  }
  if (input.lifecycle_status === "archived" || input.orgStatus === "archived") {
    parts.push("Organization archived");
  }
  if (parts.length === 0) {
    return "Routine monitoring — open org workspace or tools as needed.";
  }
  return parts.join(" · ");
}
