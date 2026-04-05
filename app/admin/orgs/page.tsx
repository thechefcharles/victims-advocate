"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  isOrganizationAdminInspectableEligible,
  isOrganizationMatchingEligible,
} from "@/lib/organizations/profileStage";
import { designationTierBadgeText, confidenceChipText } from "@/lib/trustDisplay";
import {
  buildAdminOrgCue,
  lifecycleStatusLabel,
  operationalStatusLabel,
  profileStageLabel,
  publicProfileStatusLabel,
} from "@/lib/admin/orgAdminLabels";
import { ROUTES } from "@/lib/routes/pageRegistry";

type AdminOrg = {
  id: string;
  created_at: string;
  name: string;
  type: string;
  status: string;
  lifecycle_status?: string;
  public_profile_status?: string;
  activation_submitted_at?: string | null;
  /** Active memberships with org_owner role */
  org_owner_count?: number;
  profile_status?: string | null;
  profile_stage?: string | null;
  accepting_clients?: boolean | null;
  capacity_status?: string | null;
  service_types?: string[] | null;
  languages?: string[] | null;
  designation_tier?: string | null;
  designation_confidence?: string | null;
  /** Phase 4: org-led sensitive profile edit logged; non-blocking. */
  has_sensitive_profile_flag?: boolean;
  /** Phase 5: pending org_claim_requests for this org */
  has_pending_ownership_claim?: boolean;
  has_pending_activation?: boolean;
};

type PendingProposal = {
  id: string;
  created_at: string;
  created_by: string;
  created_by_email: string | null;
  status: string;
  name: string;
  type: string;
  address: string;
  phone: string;
  website: string | null;
  program_type: string | null;
  notes: string | null;
};

type PendingOrgRepJoinRequest = {
  id: string;
  created_at: string;
  user_id: string;
  organization_id: string;
  organization_name: string;
  requester_display_name: string;
  requester_email: string | null;
};

type PendingOrgOwnershipClaim = {
  id: string;
  submitted_at: string;
  user_id: string;
  organization_id: string;
  organization_name: string;
  requester_display_name: string;
  requester_email: string | null;
};

function formatServicesPreview(services: string[] | null | undefined, max = 3): string {
  if (!services?.length) return "—";
  const shown = services.slice(0, max).map((s) => s.replace(/_/g, " "));
  const more = services.length > max ? ` +${services.length - max}` : "";
  return shown.join(", ") + more;
}

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [proposals, setProposals] = useState<PendingProposal[]>([]);
  const [repJoinRequests, setRepJoinRequests] = useState<PendingOrgRepJoinRequest[]>([]);
  const [ownershipClaims, setOwnershipClaims] = useState<PendingOrgOwnershipClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<"nonprofit" | "hospital" | "gov" | "other">("nonprofit");
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [stageFilter, setStageFilter] = useState<"all" | "created" | "searchable" | "enriched">("all");
  const [designationFilter, setDesignationFilter] = useState<
    "all" | "has" | "none" | "low_or_insufficient"
  >("all");
  const [acceptingFilter, setAcceptingFilter] = useState<"all" | "yes" | "no">("all");
  const [showUnreadyInternal, setShowUnreadyInternal] = useState(false);
  /** Phase 5: show orgs with follow-up cues only */
  const [followUpOnly, setFollowUpOnly] = useState(false);

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const res = await fetch("/api/admin/orgs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setErr(getApiErrorMessage(json, "Failed to load organizations"));
      setOrgs([]);
      return;
    }
    const json = await res.json();
    setOrgs(json.data?.orgs ?? []);
    setErr(null);

    const propRes = await fetch("/api/admin/pending-org-proposals", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (propRes.ok) {
      const propJson = await propRes.json();
      setProposals(propJson.data?.proposals ?? []);
    } else {
      setProposals([]);
    }

    const joinRes = await fetch("/api/admin/org-rep-join-requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (joinRes.ok) {
      const joinJson = await joinRes.json();
      setRepJoinRequests(joinJson.data?.requests ?? []);
    } else {
      setRepJoinRequests([]);
    }

    const claimRes = await fetch("/api/admin/org-claim-requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (claimRes.ok) {
      const claimJson = await claimRes.json();
      setOwnershipClaims(claimJson.data?.claims ?? []);
    } else {
      setOwnershipClaims([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [orgs, err]);

  const filteredOrgs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orgs.filter((o) => {
      // Admin default list stays broader than product matching eligibility.
      // Toggle "Show incomplete / unready organizations" to inspect everything else.
      if (!showUnreadyInternal && !isOrganizationAdminInspectableEligible(o)) return false;

      if (followUpOnly) {
        const needsFollowUp =
          (o.org_owner_count ?? 0) === 0 ||
          o.has_pending_ownership_claim === true ||
          o.has_pending_activation === true ||
          o.has_sensitive_profile_flag === true;
        if (!needsFollowUp) return false;
      }

      if (q) {
        const nameMatch = o.name.toLowerCase().includes(q);
        const svc = (o.service_types ?? []).some((s) => s.toLowerCase().includes(q));
        const lang = (o.languages ?? []).some((s) => s.toLowerCase().includes(q));
        if (!nameMatch && !svc && !lang) return false;
      }

      if (statusFilter === "active" && o.status !== "active") return false;
      if (statusFilter === "inactive" && o.status === "active") return false;

      const stage = (o.profile_stage ?? "").trim() || "created";
      if (stageFilter !== "all" && stage !== stageFilter) return false;

      if (designationFilter === "has" && !o.designation_tier) return false;
      if (designationFilter === "none" && o.designation_tier) return false;
      if (designationFilter === "low_or_insufficient") {
        const low =
          o.designation_confidence === "low" || o.designation_tier === "insufficient_data";
        if (!low) return false;
      }

      if (acceptingFilter === "yes" && o.accepting_clients !== true) return false;
      if (acceptingFilter === "no" && o.accepting_clients !== false) return false;

      return true;
    });
  }, [
    orgs,
    query,
    statusFilter,
    stageFilter,
    designationFilter,
    acceptingFilter,
    showUnreadyInternal,
    followUpOnly,
  ]);

  const matchingCount = useMemo(
    () => orgs.filter((o) => isOrganizationMatchingEligible(o)).length,
    [orgs]
  );

  const runOrgLifecycle = async (
    orgId: string,
    action: "pause" | "resume" | "archive" | "resolve-flags"
  ) => {
    const key = `${action}:${orgId}`;
    setActingId(key);
    setErr(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const path =
        action === "resolve-flags"
          ? `/api/admin/orgs/${orgId}/resolve-profile-flags`
          : `/api/admin/orgs/${orgId}/${action}`;
      const res = await fetch(path, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await load();
      } else {
        const json = await res.json().catch(() => ({}));
        setErr(
          getApiErrorMessage(
            json,
            action === "pause"
              ? "Could not pause public profile"
              : action === "resume"
                ? "Could not resume public profile"
                : action === "archive"
                  ? "Could not archive organization"
                  : "Could not update profile flags"
          )
        );
      }
    } finally {
      setActingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = createName.trim();
    if (!name) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/orgs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, type: createType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to create organization"));
        return;
      }
      setCreateName("");
      setErr(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          contextLine="Admin → Organizations"
          eyebrow="Admin · Internal only"
          title="Organizations"
          subtitle="Operational control surface: operational status, lifecycle, public visibility, profile stage, ownership, activation, and sensitive edits — without changing matching rules yet."
          rightActions={
            <>
              <Link href="/admin/cases" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
                Cases
              </Link>
              <Link href="/admin/ecosystem" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
                Ecosystem
              </Link>
              <Link href="/admin/audit" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
                Audit
              </Link>
              <Link
                href="/admin/grading"
                className="inline-flex items-center rounded-md bg-[var(--color-teal-deep)] px-2.5 py-1 text-sm font-medium text-white hover:bg-[var(--color-teal)]"
              >
                Review grading
              </Link>
              <Link href="/admin/designations" className="text-sm text-[var(--color-muted)] hover:text-white">
                Review designation
              </Link>
              <Link href="/admin/designation-reviews" className="text-sm text-amber-400 hover:text-amber-200">
                Review requests
              </Link>
            </>
          }
        />

        {!loading && (
          <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/75 px-4 py-3 text-xs text-[var(--color-muted)] space-y-1">
            {(() => {
              const qClaims = ownershipClaims.length;
              const qJoins = repJoinRequests.length;
              const qAct = orgs.filter((o) => o.public_profile_status === "pending_review").length;
              const qProp = proposals.filter((p) => p.status === "pending").length;
              const total = qClaims + qJoins + qAct + qProp;
              if (total === 0) {
                return (
                  <p>
                    <span className="text-[var(--color-muted)]">Queues:</span> no pending ownership claims, join
                    requests, activations, or proposals.
                  </p>
                );
              }
              return (
                <p>
                  <span className="text-[var(--color-muted)]">Queues:</span>{" "}
                  <span className="text-[var(--color-slate)]">{qClaims} ownership</span> ·{" "}
                  <span className="text-[var(--color-slate)]">{qJoins} join</span> ·{" "}
                  <span className="text-[var(--color-slate)]">{qAct} activation</span> ·{" "}
                  <span className="text-[var(--color-slate)]">{qProp} proposals</span>
                </p>
              );
            })()}
            {orgs.some((o) => o.has_sensitive_profile_flag) ? (
              <p className="text-violet-200/80">
                Some organizations have unresolved sensitive profile flags — see rows below or{" "}
                <Link href="/admin/audit" className="text-violet-300 hover:underline">
                  Audit log
                </Link>
                .
              </p>
            ) : (
              <p className="text-[var(--color-muted)]">No unresolved sensitive-change flags on the list right now.</p>
            )}
          </div>
        )}

        <section className="rounded-2xl border border-violet-500/35 bg-violet-950/20 p-5">
          <h2 className="text-sm font-semibold text-violet-100 mb-2">
            Pending organization ownership claims ({ownershipClaims.length})
          </h2>
          {ownershipClaims.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)] py-1">No pending ownership claims.</p>
          ) : (
            <>
            <p className="text-xs text-violet-200/80 mb-4">
              A directory or setup flow created the organization (or it already existed without an owner) and
              the requester is asking to become <strong className="text-violet-100">Organization Owner</strong>.
              Approve adds membership and marks the claim approved; reject closes the request without access.
            </p>
            <ul className="space-y-4">
              {ownershipClaims.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-[var(--color-navy)]">{r.organization_name}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        Requester: {r.requester_display_name}
                        {r.requester_email ? ` · ${r.requester_email}` : ""}
                      </p>
                      <p className="text-[11px] text-[var(--color-muted)] mt-1">
                        Submitted {new Date(r.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          setActingId(r.id);
                          try {
                            const { data: sessionData } = await supabase.auth.getSession();
                            const token = sessionData.session?.access_token;
                            if (!token) return;
                            const res = await fetch(`/api/admin/org-claim-requests/${r.id}/approve`, {
                              method: "POST",
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (res.ok) await load();
                            else {
                              const json = await res.json().catch(() => ({}));
                              setErr(getApiErrorMessage(json, "Could not approve"));
                            }
                          } finally {
                            setActingId(null);
                          }
                        }}
                        disabled={actingId !== null}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {actingId === r.id ? "…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setActingId(r.id);
                          try {
                            const { data: sessionData } = await supabase.auth.getSession();
                            const token = sessionData.session?.access_token;
                            if (!token) return;
                            const res = await fetch(`/api/admin/org-claim-requests/${r.id}/reject`, {
                              method: "POST",
                              headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({}),
                            });
                            if (res.ok) await load();
                            else {
                              const json = await res.json().catch(() => ({}));
                              setErr(getApiErrorMessage(json, "Could not reject"));
                            }
                          } finally {
                            setActingId(null);
                          }
                        }}
                        disabled={actingId !== null}
                        className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)] disabled:opacity-50"
                      >
                        {actingId === r.id ? "…" : "Reject"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-cyan-500/35 bg-cyan-950/20 p-5">
          <h2 className="text-sm font-semibold text-cyan-100 mb-2">
            Pending requests to join an organization ({repJoinRequests.length})
          </h2>
          {repJoinRequests.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)] py-1">No pending join requests.</p>
          ) : (
            <>
              <p className="text-xs text-cyan-200/80 mb-4">
                Someone with an organization leader account asked to join an existing workspace (usually after
                finding the agency in the Illinois directory). Approve adds them as{" "}
                <strong className="text-cyan-100">Organization Owner</strong> for that org. Org managers are
                notified too, but you can act here if there is no owner yet.
              </p>
              <ul className="space-y-4">
                {repJoinRequests.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-[var(--color-navy)]">{r.organization_name}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        Requester: {r.requester_display_name}
                        {r.requester_email ? ` · ${r.requester_email}` : ""}
                      </p>
                      <p className="text-[11px] text-[var(--color-muted)] mt-1">
                        Submitted {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          setActingId(r.id);
                          try {
                            const { data: sessionData } = await supabase.auth.getSession();
                            const token = sessionData.session?.access_token;
                            if (!token) return;
                            const res = await fetch(`/api/org/rep-join-requests/${r.id}/approve`, {
                              method: "POST",
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (res.ok) await load();
                            else {
                              const json = await res.json().catch(() => ({}));
                              setErr(getApiErrorMessage(json, "Could not approve"));
                            }
                          } finally {
                            setActingId(null);
                          }
                        }}
                        disabled={actingId !== null}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {actingId === r.id ? "…" : "Approve Join Request"}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setActingId(r.id);
                          try {
                            const { data: sessionData } = await supabase.auth.getSession();
                            const token = sessionData.session?.access_token;
                            if (!token) return;
                            const res = await fetch(`/api/org/rep-join-requests/${r.id}/decline`, {
                              method: "POST",
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (res.ok) await load();
                            else {
                              const json = await res.json().catch(() => ({}));
                              setErr(getApiErrorMessage(json, "Could not decline"));
                            }
                          } finally {
                            setActingId(null);
                          }
                        }}
                        disabled={actingId !== null}
                        className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)] disabled:opacity-50"
                      >
                        {actingId === r.id ? "…" : "Decline"}
                      </button>
                    </div>
                  </div>
                </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-teal-500/35 bg-teal-950/15 p-5">
          <h2 className="text-sm font-semibold text-teal-100 mb-2">
            Organizations pending activation (
            {orgs.filter((o) => o.public_profile_status === "pending_review").length})
          </h2>
          {orgs.filter((o) => o.public_profile_status === "pending_review").length === 0 ? (
            <p className="text-xs text-[var(--color-muted)] py-1">There are no organizations pending activation.</p>
          ) : (
            <>
              <p className="text-xs text-teal-200/80 mb-4">
                An organization owner submitted this workspace for public visibility. Activating sets{" "}
                <strong className="text-teal-100">public profile</strong> to active (matching/search enforcement
                still follows Phase 6). Reject returns the org to draft so they can revise and resubmit.
              </p>
              <ul className="space-y-4">
                {orgs
                  .filter((o) => o.public_profile_status === "pending_review")
                  .map((o) => (
                  <li
                    key={o.id}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--color-navy)]">{o.name}</p>
                        <p className="text-xs text-[var(--color-muted)]">
                          Owners (active): {o.org_owner_count ?? 0} · Lifecycle:{" "}
                          {o.lifecycle_status ?? "—"} · Stage: {o.profile_stage ?? "—"}
                        </p>
                        <p className="text-[11px] text-[var(--color-muted)] mt-1">
                          Submitted{" "}
                          {o.activation_submitted_at
                            ? new Date(o.activation_submitted_at).toLocaleString()
                            : "—"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setActingId(o.id);
                            try {
                              const { data: sessionData } = await supabase.auth.getSession();
                              const token = sessionData.session?.access_token;
                              if (!token) return;
                              const res = await fetch(`/api/admin/orgs/${o.id}/activate`, {
                                method: "POST",
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (res.ok) await load();
                              else {
                                const json = await res.json().catch(() => ({}));
                                setErr(getApiErrorMessage(json, "Could not activate"));
                              }
                            } finally {
                              setActingId(null);
                            }
                          }}
                          disabled={actingId !== null}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {actingId === o.id ? "…" : "Activate Organization"}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setActingId(o.id);
                            try {
                              const { data: sessionData } = await supabase.auth.getSession();
                              const token = sessionData.session?.access_token;
                              if (!token) return;
                              const res = await fetch(`/api/admin/orgs/${o.id}/reject-activation`, {
                                method: "POST",
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({}),
                              });
                              if (res.ok) await load();
                              else {
                                const json = await res.json().catch(() => ({}));
                                setErr(getApiErrorMessage(json, "Could not reject"));
                              }
                            } finally {
                              setActingId(null);
                            }
                          }}
                          disabled={actingId !== null}
                          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)] disabled:opacity-50"
                        >
                          {actingId === o.id ? "…" : "Reject / Request Changes"}
                        </button>
                      </div>
                    </div>
                  </li>
                  ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5">
          <h2 className="text-sm font-semibold text-amber-100 mb-3">
            Pending organization requests ({proposals.filter((p) => p.status === "pending").length})
          </h2>
          {proposals.filter((p) => p.status === "pending").length === 0 ? (
            <p className="text-xs text-[var(--color-muted)] py-1">No pending organization proposals.</p>
          ) : (
            <>
              <p className="text-xs text-amber-200/80 mb-4">
                <strong className="text-amber-100">Approve &amp; create organization</strong> adds a new
                organization record in NxtStps and sets the submitter as{" "}
                <strong className="text-amber-100">Organization Owner</strong>.{" "}
                <strong className="text-amber-100">Decline</strong> closes the request without creating an org.
              </p>
              <ul className="space-y-4">
                {proposals
                  .filter((p) => p.status === "pending")
                  .map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--color-navy)]">{p.name}</p>
                        <p className="text-xs text-[var(--color-muted)]">
                          {p.type}
                          {p.program_type ? ` · ${p.program_type}` : ""}
                        </p>
                        {p.address && <p className="text-xs text-[var(--color-muted)] mt-1">{p.address}</p>}
                        {(p.phone || p.website) && (
                          <p className="text-xs text-[var(--color-muted)]">
                            {p.phone}
                            {p.phone && p.website && " · "}
                            {p.website && (
                              <a
                                href={p.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:underline"
                              >
                                Website
                              </a>
                            )}
                          </p>
                        )}
                        {p.created_by_email && (
                          <p className="text-xs text-[var(--color-muted)] mt-1">Submitted by {p.created_by_email}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setActingId(p.id);
                            try {
                              const { data: sessionData } = await supabase.auth.getSession();
                              const token = sessionData.session?.access_token;
                              if (!token) return;
                              const res = await fetch(`/api/admin/pending-org-proposals/${p.id}/approve`, {
                                method: "POST",
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (res.ok) await load();
                              else {
                                const json = await res.json().catch(() => ({}));
                                setErr(getApiErrorMessage(json, "Could not approve"));
                              }
                            } finally {
                              setActingId(null);
                            }
                          }}
                          disabled={actingId !== null}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {actingId === p.id ? "…" : "Approve & Create Organization"}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setActingId(p.id);
                            try {
                              const { data: sessionData } = await supabase.auth.getSession();
                              const token = sessionData.session?.access_token;
                              if (!token) return;
                              const res = await fetch(`/api/admin/pending-org-proposals/${p.id}/decline`, {
                                method: "POST",
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (res.ok) await load();
                              else {
                                const json = await res.json().catch(() => ({}));
                                setErr(getApiErrorMessage(json, "Could not decline"));
                              }
                            } finally {
                              setActingId(null);
                            }
                          }}
                          disabled={actingId !== null}
                          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)] disabled:opacity-50"
                        >
                          {actingId === p.id ? "…" : "Decline"}
                        </button>
                      </div>
                    </div>
                  </li>
                  ))}
              </ul>
            </>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3">
          <p className="text-sm text-[var(--color-slate)] flex-1 min-w-[200px]">
            Run internal <strong className="text-white">CBO quality grading</strong> per org (scores stay
            admin-only). Then use <strong className="text-white">Review designation</strong> for tiers.
          </p>
          <Link
            href="/admin/grading"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-teal)] shadow-sm"
          >
            Open grading
          </Link>
        </div>

        <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-5">
          <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-1">Create organization (admin)</h2>
          <p className="text-xs text-[var(--color-muted)] mb-3">
            Creates an active organization record only—no Organization Owner is added automatically. Use org
            invites or membership tools to assign an owner, or expect{" "}
            <span className="text-[var(--color-muted)]">No Organization Owner Assigned</span> in the list below until you
            do.
          </p>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Organization name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] w-64"
            />
            <select
              value={createType}
              onChange={(e) =>
                setCreateType(e.target.value as "nonprofit" | "hospital" | "gov" | "other")
              }
              className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-navy)]"
            >
              <option value="nonprofit">Nonprofit</option>
              <option value="hospital">Hospital</option>
              <option value="gov">Government</option>
              <option value="other">Other</option>
            </select>
            <button
              type="submit"
              disabled={submitting || !createName.trim()}
              className="rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create Organization"}
            </button>
          </form>
        </section>

        {err && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-5 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--color-charcoal)]">All organizations</h2>
            <p className="text-[11px] text-[var(--color-muted)]">
              Product-visible in matching/discovery: {matchingCount} of {orgs.length}
            </p>
          </div>

          <p className="text-xs text-[var(--color-muted)] border-l-2 border-[var(--color-border)] pl-3">
            By default, this list shows organizations that meet the same readiness bar as matching (active
            org, active profile, profile stage searchable or enriched). Turn on the internal toggle below to
            include incomplete or unready profiles.
          </p>

          <label className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={showUnreadyInternal}
              onChange={(e) => setShowUnreadyInternal(e.target.checked)}
              className="rounded border-[var(--color-border)]"
            />
            <span>
              Show incomplete / unready organizations{" "}
              <span className="text-[var(--color-muted)]">(internal — includes profile stage “created”)</span>
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-xs">
              <span className="text-[var(--color-muted)]">Search name, service, or language</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. compensation, es"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2 text-sm text-[var(--color-navy)]"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-[var(--color-muted)]">Org status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2 text-sm text-[var(--color-navy)]"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-[var(--color-muted)]">Profile stage</span>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as typeof stageFilter)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2 text-sm text-[var(--color-navy)]"
              >
                <option value="all">All</option>
                <option value="created">Created</option>
                <option value="searchable">Searchable</option>
                <option value="enriched">Enriched</option>
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-[var(--color-muted)]">Designation</span>
              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value as typeof designationFilter)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2 text-sm text-[var(--color-navy)]"
              >
                <option value="all">All</option>
                <option value="has">Has designation</option>
                <option value="none">No designation yet</option>
                <option value="low_or_insufficient">Low confidence or insufficient data</option>
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-[var(--color-muted)]">Accepting clients</span>
              <select
                value={acceptingFilter}
                onChange={(e) => setAcceptingFilter(e.target.value as typeof acceptingFilter)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2 text-sm text-[var(--color-navy)]"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)] cursor-pointer sm:col-span-2 lg:col-span-3">
              <input
                type="checkbox"
                checked={followUpOnly}
                onChange={(e) => setFollowUpOnly(e.target.checked)}
                className="rounded border-[var(--color-border)]"
              />
              <span>
                Follow-up only{" "}
                <span className="text-[var(--color-muted)]">
                  (no owner, pending claim, pending activation, or sensitive profile flag)
                </span>
              </span>
            </label>
          </div>

          {loading ? (
            <p className="text-sm text-[var(--color-muted)]">Loading…</p>
          ) : orgs.length === 0 ? (
            <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/70 px-4 py-6 text-sm text-[var(--color-muted)]">
              <p className="font-medium text-[var(--color-slate)]">No organizations yet.</p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                Create an organization above to onboard a partner and assign advocates.
              </p>
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/70 px-4 py-6 text-sm text-[var(--color-muted)]">
              <p className="font-medium text-[var(--color-slate)]">No organizations match these filters.</p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                Try clearing search text, setting filters to “All,” or enabling “Show incomplete / unready” if
                you expect organizations still in draft.
              </p>
              {followUpOnly ? (
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  There are no organizations with follow-up cues (missing owner, pending claim, pending
                  activation, or sensitive profile flag) under the current filters.
                </p>
              ) : null}
              {!showUnreadyInternal && matchingCount === 0 ? (
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  No organizations are currently ready for matching in this directory. Use the internal
                  toggle to review drafts.
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredOrgs.map((o) => {
                const adminCue = buildAdminOrgCue({
                  orgStatus: o.status,
                  lifecycle_status: o.lifecycle_status,
                  public_profile_status: o.public_profile_status,
                  org_owner_count: o.org_owner_count,
                  has_pending_ownership_claim: o.has_pending_ownership_claim,
                  has_sensitive_profile_flag: o.has_sensitive_profile_flag,
                });
                const opArchived = o.status === "archived";
                const pub = String(o.public_profile_status ?? "draft");
                const canPause = !opArchived && pub !== "paused";
                const canResume = !opArchived && pub === "paused";
                const canArchive = !opArchived;
                return (
                  <li
                    key={o.id}
                    className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="font-medium text-[var(--color-navy)] truncate">{o.name}</p>
                        <p className="text-[11px] text-[var(--color-muted)]">{o.type}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span
                            className="text-[10px] rounded border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-1.5 py-0.5 text-[var(--color-slate)]"
                            title={operationalStatusLabel(o.status)}
                          >
                            Op: {o.status}
                          </span>
                          <span
                            className="text-[10px] rounded border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-1.5 py-0.5 text-[var(--color-slate)]"
                            title={lifecycleStatusLabel(o.lifecycle_status)}
                          >
                            Life: {o.lifecycle_status ?? "—"}
                          </span>
                          <span
                            className="text-[10px] rounded border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-1.5 py-0.5 text-[var(--color-slate)]"
                            title={publicProfileStatusLabel(o.public_profile_status)}
                          >
                            Public: {o.public_profile_status ?? "—"}
                          </span>
                          <span
                            className="text-[10px] rounded border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-1.5 py-0.5 text-[var(--color-slate)]"
                            title={profileStageLabel(o.profile_stage)}
                          >
                            Stage: {o.profile_stage ?? "—"}
                          </span>
                          <span
                            className="text-[10px] rounded border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-1.5 py-0.5 text-[var(--color-slate)]"
                            title="Active org_owner memberships"
                          >
                            Owners: {o.org_owner_count ?? 0}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(o.org_owner_count ?? 0) === 0 ? (
                            <span className="text-[10px] rounded-full border border-amber-800/45 bg-amber-950/35 px-2 py-0.5 text-amber-100/95">
                              No owner assigned
                            </span>
                          ) : null}
                          {o.has_pending_ownership_claim ? (
                            <span className="text-[10px] rounded-full border border-violet-800/40 bg-violet-950/30 px-2 py-0.5 text-violet-100/90">
                              Ownership claim pending
                            </span>
                          ) : null}
                          {o.has_pending_activation ? (
                            <span className="text-[10px] rounded-full border border-teal-800/40 bg-teal-950/25 px-2 py-0.5 text-teal-100/90">
                              Pending activation
                            </span>
                          ) : null}
                          {o.has_sensitive_profile_flag ? (
                            <span
                              className="text-[10px] rounded-full border border-violet-800/45 px-2 py-0.5 text-violet-200/90"
                              title="Sensitive profile fields changed — informational; audit has detail."
                            >
                              Sensitive edits logged
                            </span>
                          ) : null}
                          {o.designation_tier ? (
                            <span className="text-[10px] rounded-full border border-teal-800/50 px-2 py-0.5 text-teal-200/90">
                              {designationTierBadgeText(o.designation_tier) ?? o.designation_tier}
                              {o.designation_confidence
                                ? ` · ${confidenceChipText(o.designation_confidence) ?? o.designation_confidence}`
                                : ""}
                            </span>
                          ) : (
                            <span className="text-[10px] rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-muted)]">
                              No designation yet
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-muted)] pt-1">
                          Services: {formatServicesPreview(o.service_types)} · Capacity:{" "}
                          {o.capacity_status ?? "—"}
                          {o.accepting_clients === true ? " · accepting" : ""}
                          {o.accepting_clients === false ? " · not accepting" : ""}
                        </p>
                        <p className="text-[11px] text-[var(--color-muted)] leading-relaxed border-l border-[var(--color-border)] pl-2">
                          Next: {adminCue}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0 items-end min-w-[11rem]">
                        <Link
                          href={`${ROUTES.organizationSettings}?organization_id=${o.id}`}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                        >
                          View organization
                        </Link>
                        <Link
                          href={`/admin/designations?org=${o.id}`}
                          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-charcoal)]"
                        >
                          Review designation
                        </Link>
                        <Link
                          href={`/admin/grading?org=${o.id}`}
                          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-charcoal)]"
                        >
                          Review grading
                        </Link>
                        <Link
                          href={`/admin/grading?org=${o.id}#org-signals-snapshot`}
                          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-charcoal)]"
                        >
                          Review signals
                        </Link>
                        <div
                          className="mt-2 pt-2 border-t border-[var(--color-border-light)] w-full space-y-1"
                          aria-label="Admin-only lifecycle"
                        >
                          <p className="text-[10px] uppercase tracking-wide text-[var(--color-slate)] text-right">
                            Admin
                          </p>
                          {canPause ? (
                            <button
                              type="button"
                              disabled={actingId !== null}
                              onClick={() => void runOrgLifecycle(o.id, "pause")}
                              className="w-full rounded border border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-slate)] hover:bg-[var(--color-light-sand)] disabled:opacity-50"
                            >
                              {actingId === `pause:${o.id}` ? "…" : "Pause public profile"}
                            </button>
                          ) : null}
                          {canResume ? (
                            <button
                              type="button"
                              disabled={actingId !== null}
                              onClick={() => void runOrgLifecycle(o.id, "resume")}
                              className="w-full rounded border border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-slate)] hover:bg-[var(--color-light-sand)] disabled:opacity-50"
                            >
                              {actingId === `resume:${o.id}` ? "…" : "Resume public profile"}
                            </button>
                          ) : null}
                          {canArchive ? (
                            <button
                              type="button"
                              disabled={actingId !== null}
                              onClick={() => {
                                if (
                                  typeof window !== "undefined" &&
                                  !window.confirm(
                                    "Archive this organization? Operational and lifecycle status become archived; public profile will be paused. This is intended for partners that should no longer appear in admin workflows."
                                  )
                                ) {
                                  return;
                                }
                                void runOrgLifecycle(o.id, "archive");
                              }}
                              className="w-full rounded border border-red-900/50 px-2 py-1 text-[11px] text-red-200/90 hover:bg-red-950/40 disabled:opacity-50"
                            >
                              {actingId === `archive:${o.id}` ? "…" : "Archive organization"}
                            </button>
                          ) : null}
                          {o.has_sensitive_profile_flag ? (
                            <button
                              type="button"
                              disabled={actingId !== null}
                              onClick={() => void runOrgLifecycle(o.id, "resolve-flags")}
                              className="w-full rounded border border-violet-800/40 px-2 py-1 text-[11px] text-violet-200/90 hover:bg-violet-950/30 disabled:opacity-50"
                            >
                              {actingId === `resolve-flags:${o.id}`
                                ? "…"
                                : "Mark sensitive flags reviewed"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
