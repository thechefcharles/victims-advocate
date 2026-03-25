"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { PageHeader } from "@/components/layout/PageHeader";
import { buildOrgInternalFollowupCue } from "@/lib/organizations/internalFollowupCues";
import { isOrganizationMatchingEligible } from "@/lib/organizations/profileStage";
import { designationTierBadgeText, confidenceChipText } from "@/lib/trustDisplay";

type AdminOrg = {
  id: string;
  created_at: string;
  name: string;
  type: string;
  status: string;
  lifecycle_status?: string;
  public_profile_status?: string;
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
      if (!showUnreadyInternal && !isOrganizationMatchingEligible(o)) return false;

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
  ]);

  const matchingCount = useMemo(
    () => orgs.filter((o) => isOrganizationMatchingEligible(o)).length,
    [orgs]
  );

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
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          contextLine="Admin → Organizations"
          eyebrow="Admin · Internal only"
          title="Organizations"
          subtitle="Internal oversight of partner organizations: readiness, designation, and follow-up. Default view emphasizes organizations aligned with matching (active profile, searchable or enriched stage)."
          rightActions={
            <>
              <Link href="/admin/cases" className="text-sm text-slate-400 hover:text-slate-200">
                Cases
              </Link>
              <Link href="/admin/ecosystem" className="text-sm text-slate-400 hover:text-slate-200">
                Ecosystem
              </Link>
              <Link href="/admin/audit" className="text-sm text-slate-400 hover:text-slate-200">
                Audit
              </Link>
              <Link
                href="/admin/grading"
                className="inline-flex items-center rounded-md bg-slate-700 px-2.5 py-1 text-sm font-medium text-white hover:bg-slate-600"
              >
                Review grading
              </Link>
              <Link href="/admin/designations" className="text-sm text-slate-400 hover:text-white">
                Review designation
              </Link>
              <Link href="/admin/designation-reviews" className="text-sm text-amber-400 hover:text-amber-200">
                Review requests
              </Link>
            </>
          }
        />

        {ownershipClaims.length > 0 && (
          <section className="rounded-2xl border border-violet-500/35 bg-violet-950/20 p-5">
            <h2 className="text-sm font-semibold text-violet-100 mb-2">
              Pending organization ownership claims ({ownershipClaims.length})
            </h2>
            <p className="text-xs text-violet-200/80 mb-4">
              A directory or setup flow created the organization (or it already existed without an owner) and
              the requester is asking to become <strong className="text-violet-100">Organization Owner</strong>.
              Approve adds membership and marks the claim approved; reject closes the request without access.
            </p>
            <ul className="space-y-4">
              {ownershipClaims.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-100">{r.organization_name}</p>
                      <p className="text-xs text-slate-400">
                        Requester: {r.requester_display_name}
                        {r.requester_email ? ` · ${r.requester_email}` : ""}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
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
                        className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                      >
                        {actingId === r.id ? "…" : "Reject"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {repJoinRequests.length > 0 && (
          <section className="rounded-2xl border border-cyan-500/35 bg-cyan-950/20 p-5">
            <h2 className="text-sm font-semibold text-cyan-100 mb-2">
              Pending requests to join an organization ({repJoinRequests.length})
            </h2>
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
                  className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-100">{r.organization_name}</p>
                      <p className="text-xs text-slate-400">
                        Requester: {r.requester_display_name}
                        {r.requester_email ? ` · ${r.requester_email}` : ""}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
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
                        className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                      >
                        {actingId === r.id ? "…" : "Decline"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {proposals.filter((p) => p.status === "pending").length > 0 && (
          <section className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5">
            <h2 className="text-sm font-semibold text-amber-100 mb-3">
              Pending organization requests ({proposals.filter((p) => p.status === "pending").length})
            </h2>
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
                    className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-100">{p.name}</p>
                        <p className="text-xs text-slate-400">
                          {p.type}
                          {p.program_type ? ` · ${p.program_type}` : ""}
                        </p>
                        {p.address && <p className="text-xs text-slate-500 mt-1">{p.address}</p>}
                        {(p.phone || p.website) && (
                          <p className="text-xs text-slate-500">
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
                          <p className="text-xs text-slate-500 mt-1">Submitted by {p.created_by_email}</p>
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
                          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                        >
                          {actingId === p.id ? "…" : "Decline"}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
          <p className="text-sm text-slate-300 flex-1 min-w-[200px]">
            Run internal <strong className="text-white">CBO quality grading</strong> per org (scores stay
            admin-only). Then use <strong className="text-white">Review designation</strong> for tiers.
          </p>
          <Link
            href="/admin/grading"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 shadow-sm"
          >
            Open grading
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">Create organization (admin)</h2>
          <p className="text-xs text-slate-500 mb-3">
            Creates an active organization record only—no Organization Owner is added automatically. Use org
            invites or membership tools to assign an owner, or expect{" "}
            <span className="text-slate-400">No Organization Owner Assigned</span> in the list below until you
            do.
          </p>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Organization name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 w-64"
            />
            <select
              value={createType}
              onChange={(e) =>
                setCreateType(e.target.value as "nonprofit" | "hospital" | "gov" | "other")
              }
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="nonprofit">Nonprofit</option>
              <option value="hospital">Hospital</option>
              <option value="gov">Government</option>
              <option value="other">Other</option>
            </select>
            <button
              type="submit"
              disabled={submitting || !createName.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
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

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">All organizations</h2>
            <p className="text-[11px] text-slate-500">
              Matching-aligned in directory: {matchingCount} of {orgs.length}
            </p>
          </div>

          <p className="text-xs text-slate-500 border-l-2 border-slate-700 pl-3">
            By default, this list shows organizations that meet the same readiness bar as matching (active
            org, active profile, profile stage searchable or enriched). Turn on the internal toggle below to
            include incomplete or unready profiles.
          </p>

          <label className="flex flex-wrap items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnreadyInternal}
              onChange={(e) => setShowUnreadyInternal(e.target.checked)}
              className="rounded border-slate-600"
            />
            <span>
              Show incomplete / unready organizations{" "}
              <span className="text-slate-500">(internal — includes profile stage “created”)</span>
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-xs">
              <span className="text-slate-500">Search name, service, or language</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. compensation, es"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-slate-500">Org status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-slate-500">Profile stage</span>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as typeof stageFilter)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="all">All</option>
                <option value="created">Created</option>
                <option value="searchable">Searchable</option>
                <option value="enriched">Enriched</option>
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-slate-500">Designation</span>
              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value as typeof designationFilter)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="all">All</option>
                <option value="has">Has designation</option>
                <option value="none">No designation yet</option>
                <option value="low_or_insufficient">Low confidence or insufficient data</option>
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-slate-500">Accepting clients</span>
              <select
                value={acceptingFilter}
                onChange={(e) => setAcceptingFilter(e.target.value as typeof acceptingFilter)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : orgs.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
              <p className="font-medium text-slate-300">No organizations yet.</p>
              <p className="mt-2 text-xs text-slate-500">
                Create an organization above to onboard a partner and assign advocates.
              </p>
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
              <p className="font-medium text-slate-300">No organizations match these filters.</p>
              <p className="mt-2 text-xs text-slate-500">
                Try clearing search text, setting filters to “All,” or enabling “Show incomplete / unready” if
                you expect organizations still in draft.
              </p>
              {!showUnreadyInternal && matchingCount === 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  No organizations are currently ready for matching in this directory. Use the internal
                  toggle to review drafts.
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredOrgs.map((o) => {
                const cue = buildOrgInternalFollowupCue({
                  orgStatus: o.status,
                  profileStatus: o.profile_status ?? null,
                  profileStage: o.profile_stage ?? null,
                  capacityStatus: o.capacity_status ?? null,
                  acceptingClients: o.accepting_clients ?? null,
                  designationTier: o.designation_tier ?? null,
                  designationConfidence: o.designation_confidence ?? null,
                });
                return (
                  <li
                    key={o.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <p className="font-medium text-slate-100 truncate">{o.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {o.type} · org {o.status}
                          {o.profile_status ? ` · profile ${o.profile_status}` : ""}
                        </p>
                        {(o.org_owner_count ?? 0) === 0 ? (
                          <p className="text-[11px] text-amber-200/90 mt-1 rounded border border-amber-800/50 bg-amber-950/40 px-2 py-1 inline-block">
                            No Organization Owner Assigned — invite or assign someone with owner access.
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="text-[10px] rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
                            Stage: {o.profile_stage ?? "—"}
                          </span>
                          {o.designation_tier ? (
                            <span className="text-[10px] rounded-full border border-teal-800/50 px-2 py-0.5 text-teal-200/90">
                              {designationTierBadgeText(o.designation_tier) ?? o.designation_tier}
                              {o.designation_confidence
                                ? ` · ${confidenceChipText(o.designation_confidence) ?? o.designation_confidence}`
                                : ""}
                            </span>
                          ) : (
                            <span className="text-[10px] rounded-full border border-slate-700 px-2 py-0.5 text-slate-500">
                              No designation yet
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 pt-1">
                          Services: {formatServicesPreview(o.service_types)} · Capacity:{" "}
                          {o.capacity_status ?? "—"}
                          {o.accepting_clients === true ? " · accepting" : ""}
                          {o.accepting_clients === false ? " · not accepting" : ""}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-relaxed border-l border-slate-700 pl-2">
                          Follow-up: {cue}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0 items-end">
                        <Link
                          href={`/advocate/org?organization_id=${o.id}`}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                        >
                          View organization
                        </Link>
                        <Link
                          href={`/admin/designations?org=${o.id}`}
                          className="text-xs text-slate-400 hover:text-slate-200"
                        >
                          Review designation
                        </Link>
                        <Link
                          href={`/admin/grading?org=${o.id}`}
                          className="text-xs text-slate-400 hover:text-slate-200"
                        >
                          Review grading
                        </Link>
                        <Link
                          href={`/admin/grading?org=${o.id}#org-signals-snapshot`}
                          className="text-xs text-slate-400 hover:text-slate-200"
                        >
                          Review signals
                        </Link>
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
