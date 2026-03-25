"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProgramCatalogSelect } from "@/components/programs/ProgramCatalogSelect";
import type { IlVictimAssistanceProgram } from "@/lib/catalog/ilProgramTypes";

const ORG_TYPES = [
  { value: "nonprofit", label: "Nonprofit" },
  { value: "hospital", label: "Hospital" },
  { value: "gov", label: "Government" },
  { value: "other", label: "Other" },
] as const;

function readOrgAlreadyExists(json: unknown): { id: string; name: string } | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const meta = o.meta as Record<string, unknown> | undefined;
  if (meta?.organization_id) {
    return {
      id: String(meta.organization_id),
      name: String(meta.organization_name ?? "This organization"),
    };
  }
  const err = o.error as Record<string, unknown> | undefined;
  const details = err?.details as Record<string, unknown> | undefined;
  if (details?.organization_id) {
    return {
      id: String(details.organization_id),
      name: String(details.organization_name ?? "This organization"),
    };
  }
  return null;
}

function readApiErrorCode(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (typeof o.code === "string") return o.code;
  const err = o.error as Record<string, unknown> | undefined;
  return typeof err?.code === "string" ? err.code : null;
}

type Props = {
  backLink?: React.ReactNode;
  initialCatalogId?: number | null;
  initialOrgNameHint?: string | null;
  initialLeaderTitleHint?: string | null;
};

export function OrganizationOnboarding({
  backLink,
  initialCatalogId = null,
  initialOrgNameHint = null,
  initialLeaderTitleHint = null,
}: Props) {
  const router = useRouter();
  const { refetchMe, role, realRole, isAdmin, orgOwnershipClaim } = useAuth();

  const [catalogId, setCatalogId] = useState<number | null>(initialCatalogId);
  const [selectedProgram, setSelectedProgram] = useState<IlVictimAssistanceProgram | null>(null);
  const [existingOrgId, setExistingOrgId] = useState<string | null>(null);
  const [existingOrgName, setExistingOrgName] = useState<string | null>(null);

  const [claimLoading, setClaimLoading] = useState(false);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);

  const [findErr, setFindErr] = useState<string | null>(null);
  const [proposalErr, setProposalErr] = useState<string | null>(null);
  const [findSuccess, setFindSuccess] = useState<string | null>(null);
  const [proposalSuccess, setProposalSuccess] = useState<string | null>(null);
  const [claimComplete, setClaimComplete] = useState(false);
  /** Non-admin directory register: org created, ownership awaiting platform admin. */
  const [claimReviewPending, setClaimReviewPending] = useState(false);
  const [dirLookupLoading, setDirLookupLoading] = useState(false);
  const [directoryOrgOwnerCount, setDirectoryOrgOwnerCount] = useState<number | null>(null);
  const [claimOwnershipLoading, setClaimOwnershipLoading] = useState(false);

  const [addNewForm, setAddNewForm] = useState({
    name: "",
    type: "nonprofit" as (typeof ORG_TYPES)[number]["value"],
    address: "",
    phone: "",
    website: "",
    program_type: "",
    notes: "",
  });

  const profileIsOrg = (realRole ?? role) === "organization" || isAdmin;

  useEffect(() => {
    const hint = initialOrgNameHint?.trim();
    if (!hint) return;
    setAddNewForm((f) => (f.name.trim() ? f : { ...f, name: hint }));
  }, [initialOrgNameHint]);

  useEffect(() => {
    setCatalogId(initialCatalogId);
  }, [initialCatalogId]);

  useEffect(() => {
    if (catalogId == null || !profileIsOrg) {
      setDirLookupLoading(false);
      return;
    }

    let cancelled = false;
    setDirLookupLoading(true);

    (async () => {
      const token = await getToken();
      if (!token || cancelled) {
        if (!cancelled) setDirLookupLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/org/directory-entry-status?catalog_entry_id=${catalogId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && json.data?.has_workspace === true && json.data.organization_id) {
          setExistingOrgId(String(json.data.organization_id));
          setExistingOrgName(String(json.data.organization_name ?? "Organization"));
          const c = json.data.org_owner_count;
          setDirectoryOrgOwnerCount(typeof c === "number" ? c : null);
        } else if (res.ok && json.data?.has_workspace === false) {
          setExistingOrgId(null);
          setExistingOrgName(null);
          setDirectoryOrgOwnerCount(null);
        }
      } finally {
        if (!cancelled) setDirLookupLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogId, profileIsOrg]);

  const clearFindConflict = () => {
    setExistingOrgId(null);
    setExistingOrgName(null);
    setDirectoryOrgOwnerCount(null);
    setFindErr(null);
  };

  const handleCatalogChange = (id: number | null, program: IlVictimAssistanceProgram | null) => {
    setCatalogId(id);
    setSelectedProgram(program);
    clearFindConflict();
    setFindSuccess(null);
    setClaimComplete(false);
    setClaimReviewPending(false);
  };

  const getToken = async (): Promise<string | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
  };

  const refreshDirectoryOwnerCount = async (cid: number) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/org/directory-entry-status?catalog_entry_id=${cid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.data?.has_workspace === true && typeof json.data.org_owner_count === "number") {
        setDirectoryOrgOwnerCount(json.data.org_owner_count);
      }
    } catch {
      /* ignore */
    }
  };

  const handleClaimDirectoryOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setFindErr(null);
    setFindSuccess(null);
    if (catalogId == null) {
      setFindErr("Select your organization from the directory first.");
      return;
    }
    if (!profileIsOrg) {
      setFindErr("This step is only available to organization leader accounts.");
      return;
    }
    setClaimLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setFindErr("Please sign in to continue.");
        return;
      }
      const res = await fetch("/api/org/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ catalog_entry_id: catalogId }),
      });
      const json = await res.json().catch(() => ({}));
      const errCode = readApiErrorCode(json);
      if (!res.ok) {
        if (errCode === "ORG_ALREADY_EXISTS") {
          const conflict = readOrgAlreadyExists(json);
          if (conflict) {
            setExistingOrgId(conflict.id);
            setExistingOrgName(conflict.name);
            setDirectoryOrgOwnerCount(null);
            if (catalogId != null) await refreshDirectoryOwnerCount(catalogId);
            return;
          }
        }
        if (errCode === "FORBIDDEN") {
          setFindErr(
            getApiErrorMessage(
              json,
              "Your account type cannot claim a directory organization. If you think this is wrong, contact support."
            )
          );
          return;
        }
        setFindErr(
          getApiErrorMessage(json, "Could not set up your organization from this directory listing.")
        );
        return;
      }
      const data = json.data ?? json;
      const claimPending =
        typeof data === "object" &&
        data !== null &&
        (data as Record<string, unknown>).claimPending === true;
      if (claimPending) {
        setClaimReviewPending(true);
        setClaimComplete(false);
      } else {
        setClaimComplete(true);
        setClaimReviewPending(false);
      }
      setFindSuccess(null);
      void refetchMe();
    } finally {
      setClaimLoading(false);
    }
  };

  const continueToOrgDashboard = async () => {
    await refetchMe();
    router.push("/organization/dashboard");
    router.refresh();
  };

  const continueToAccountProfile = async () => {
    await refetchMe();
    router.push("/account");
    router.refresh();
  };

  const handleRequestOwnership = async () => {
    if (!existingOrgId) return;
    setClaimOwnershipLoading(true);
    setFindErr(null);
    try {
      const token = await getToken();
      if (!token) {
        setFindErr("Please sign in to continue.");
        return;
      }
      const res = await fetch("/api/org/claim-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ organization_id: existingOrgId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (readApiErrorCode(json) === "DUPLICATE_CLAIM") {
          setFindErr(
            getApiErrorMessage(
              json,
              "You already have a pending ownership request for this organization."
            )
          );
          return;
        }
        if (readApiErrorCode(json) === "ORG_ALREADY_HAS_OWNER") {
          setFindErr(
            getApiErrorMessage(
              json,
              "This organization already has an owner. Use Request To Join instead."
            )
          );
          setDirectoryOrgOwnerCount((c) => (c === 0 ? 1 : c));
          return;
        }
        if (res.status === 403 || readApiErrorCode(json) === "FORBIDDEN") {
          setFindErr(
            getApiErrorMessage(
              json,
              "Your account type cannot submit an ownership request this way."
            )
          );
          return;
        }
        setFindErr(getApiErrorMessage(json, "Could not submit your ownership request."));
        return;
      }
      setClaimReviewPending(true);
      setFindSuccess(null);
      void refetchMe();
    } finally {
      setClaimOwnershipLoading(false);
    }
  };

  const handleRequestToJoin = async () => {
    if (!existingOrgId) return;
    setRequestingJoin(true);
    setFindErr(null);
    try {
      const token = await getToken();
      if (!token) {
        setFindErr("Please sign in to continue.");
        return;
      }
      const res = await fetch("/api/org/request-to-join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ organization_id: existingOrgId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 || readApiErrorCode(json) === "FORBIDDEN") {
          setFindErr(
            getApiErrorMessage(
              json,
              "Only organization leader accounts can request to join a workspace this way."
            )
          );
          return;
        }
        setFindErr(getApiErrorMessage(json, "Could not send your request."));
        return;
      }
      setFindSuccess(
        "Your Request To Join has been sent. Organization administrators (or platform staff) will review it. Check Updates for a response—you can keep using your account in the meantime."
      );
      setExistingOrgId(null);
      setExistingOrgName(null);
    } finally {
      setRequestingJoin(false);
    }
  };

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProposalErr(null);
    setProposalSuccess(null);
    if (!addNewForm.name.trim()) {
      setProposalErr("Organization name is required.");
      return;
    }
    if (!profileIsOrg) {
      setProposalErr("This step is only available to organization leader accounts.");
      return;
    }
    setProposalLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setProposalErr("Please sign in to continue.");
        return;
      }
      const res = await fetch("/api/org/pending-proposal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: addNewForm.name.trim(),
          type: addNewForm.type,
          address: addNewForm.address.trim(),
          phone: addNewForm.phone.trim(),
          website: addNewForm.website.trim() || null,
          program_type: addNewForm.program_type.trim() || null,
          notes: addNewForm.notes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 || readApiErrorCode(json) === "FORBIDDEN") {
          setProposalErr(
            getApiErrorMessage(json, "Your account type cannot submit an organization proposal.")
          );
          return;
        }
        setProposalErr(getApiErrorMessage(json, "Could not submit your request."));
        return;
      }
      setProposalSuccess(
        "We received your request. An administrator will review it before any new organization is created. We’ll notify you when there’s an update."
      );
      setAddNewForm({
        name: initialOrgNameHint?.trim() ?? "",
        type: "nonprofit",
        address: "",
        phone: "",
        website: "",
        program_type: "",
        notes: "",
      });
    } finally {
      setProposalLoading(false);
    }
  };

  const joinPanel =
    existingOrgId && directoryOrgOwnerCount !== null && directoryOrgOwnerCount > 0 ? (
      <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
        <p className="text-sm text-amber-100">
          <span className="font-medium">{existingOrgName}</span> already has a NxtStps workspace for this
          directory entry. Request To Join if you work there—no new organization is created.
        </p>
        <button
          type="button"
          onClick={handleRequestToJoin}
          disabled={requestingJoin}
          className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {requestingJoin ? "Sending…" : "Request To Join This Organization"}
        </button>
      </div>
    ) : null;

  const ownershipClaimPanel =
    existingOrgId && directoryOrgOwnerCount === 0 ? (
      <div className="space-y-3 rounded-lg border border-blue-500/40 bg-blue-950/30 px-4 py-3">
        <p className="text-sm text-blue-100">
          <span className="font-medium">{existingOrgName}</span> already has a workspace, but it does not
          have an organization owner yet. Submit an ownership request for platform administrator review.
        </p>
        <button
          type="button"
          onClick={() => void handleRequestOwnership()}
          disabled={claimOwnershipLoading || !profileIsOrg}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {claimOwnershipLoading ? "Submitting…" : "Request Ownership (Admin Review)"}
        </button>
      </div>
    ) : null;

  return (
    <div className="space-y-8">
      {backLink}

      {!profileIsOrg && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          This page is for organization leaders. Your account type can&apos;t complete these steps here.
          If you need a workspace for an agency, sign in with an organization leader profile or contact
          support.
        </div>
      )}

      {initialOrgNameHint?.trim() && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
          <p className="font-medium text-slate-200">From your signup</p>
          <p className="mt-1">
            Organization name: <span className="text-slate-100">{initialOrgNameHint.trim()}</span>
            {initialLeaderTitleHint?.trim() ? (
              <>
                {" "}
                · Your title: <span className="text-slate-100">{initialLeaderTitleHint.trim()}</span>
              </>
            ) : null}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            We use this to prefill search and forms only—it does not create or join anything automatically.
          </p>
        </div>
      )}

      {(orgOwnershipClaim?.status === "pending" || claimReviewPending) && (
        <div className="rounded-2xl border border-amber-500/45 bg-amber-950/25 px-5 py-5 space-y-3">
          <h3 className="text-base font-semibold text-amber-100">Your request is under review</h3>
          <p className="text-sm text-amber-100/90">
            {orgOwnershipClaim?.organizationName ? (
              <>
                We received your ownership request for{" "}
                <span className="font-medium text-amber-50">{orgOwnershipClaim.organizationName}</span>. A
                platform administrator will approve or decline it.
              </>
            ) : (
              <>
                We received your ownership request. A platform administrator will approve or decline it.
              </>
            )}
          </p>
          <p className="text-xs text-amber-200/75">
            You can keep using your account. We&apos;ll notify you when there&apos;s an update.
          </p>
        </div>
      )}

      {orgOwnershipClaim?.status === "rejected" && !claimReviewPending && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/20 px-5 py-5 space-y-3">
          <h3 className="text-base font-semibold text-red-100">Your request was not approved</h3>
          <p className="text-sm text-red-100/90">
            Your ownership request for{" "}
            <span className="font-medium text-red-50">{orgOwnershipClaim.organizationName}</span> was not
            approved. You can submit a new request below if your situation changes.
          </p>
          {orgOwnershipClaim.reviewerNote ? (
            <p className="text-xs text-red-200/80 border border-red-800/40 rounded-lg px-3 py-2 bg-red-950/40">
              {orgOwnershipClaim.reviewerNote}
            </p>
          ) : null}
        </div>
      )}

      {claimComplete && (
        <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/30 px-5 py-5 space-y-3">
          <h3 className="text-base font-semibold text-emerald-100">Your Organization Has Been Created</h3>
          <p className="text-sm text-emerald-100/90">
            You are now the <span className="font-medium text-emerald-50">Organization Owner</span> for this
            agency in NxtStps.
          </p>
          <p className="text-xs text-emerald-200/70">Next, open your workspace or add profile details for your team.</p>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={() => void continueToOrgDashboard()}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 text-center"
            >
              Continue To Organization Dashboard
            </button>
            <button
              type="button"
              onClick={() => void continueToAccountProfile()}
              className="rounded-lg border border-emerald-600/50 px-4 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/40 text-center"
            >
              Complete Your Organization Profile
            </button>
          </div>
        </div>
      )}

      {findSuccess && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 space-y-2">
          <p>{findSuccess}</p>
          <p className="text-xs text-emerald-200/80">
            What happens next: an administrator or org manager will approve or decline your Request To Join.
            You don&apos;t need to submit again unless you&apos;re asked to.
          </p>
        </div>
      )}

      <section
        id="onboarding-find"
        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-sm space-y-4"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-50">1. Find My Organization</h2>
          <p className="text-sm text-slate-400 mt-1">
            Search the Illinois Crime Victim Assistance Services directory. If your agency already has a
            workspace, use Request To Join. If not, you can set one up from this verified listing.
          </p>
        </div>

        <form onSubmit={handleClaimDirectoryOrg} className="space-y-4">
          <ProgramCatalogSelect
            id="onboarding-org-catalog"
            label="Search directory by name, program type, or location"
            required={false}
            value={catalogId}
            onChange={handleCatalogChange}
            initialSearchQuery={initialOrgNameHint?.trim() || null}
          />

          {catalogId != null && dirLookupLoading && (
            <p className="text-xs text-slate-500">Checking whether this listing already has a workspace…</p>
          )}

          {selectedProgram && !existingOrgId && (
            <p className="text-xs text-slate-500 leading-relaxed">
              Selected: #{selectedProgram.id} · {selectedProgram.organization} — {selectedProgram.programType}
            </p>
          )}

          {!existingOrgId &&
            catalogId != null &&
            !dirLookupLoading &&
            !claimComplete &&
            !claimReviewPending && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm text-slate-300 space-y-2">
              <p className="text-slate-200 font-medium">Verified directory listing</p>
              <p>
                This program is listed in the verified Illinois directory. If no workspace exists for it yet,
                you can create your organization from this listing.{" "}
                {isAdmin ? (
                  <>
                    As a platform administrator, you will be assigned as Organization Owner immediately.
                  </>
                ) : (
                  <>
                    Your ownership will be submitted for platform administrator review before you can manage
                    the workspace.
                  </>
                )}{" "}
                Only one NxtStps organization is allowed per directory entry.
              </p>
              <button
                type="submit"
                disabled={claimLoading || !profileIsOrg || claimComplete || claimReviewPending}
                className="mt-2 w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {claimLoading ? "Working…" : "Set Up Organization From This Listing"}
              </button>
            </div>
          )}

          {ownershipClaimPanel}
          {joinPanel}

          {findErr && (
            <div className="text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
              {findErr}
            </div>
          )}
        </form>
      </section>

      <section
        id="onboarding-join"
        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-sm space-y-4"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-50">2. Request To Join</h2>
          <p className="text-sm text-slate-400 mt-1">
            If your agency already has a NxtStps workspace, select it in{" "}
            <span className="text-slate-300">Find My Organization</span>—we&apos;ll show Request To Join when
            that&apos;s the case. You don&apos;t need to try Set Up first.
          </p>
        </div>
        <p className="text-sm text-slate-500">
          We&apos;ll notify people who manage that organization (or an administrator). This never creates a
          duplicate organization.
        </p>
        <p className="text-xs text-slate-600">
          The Request To Join button appears in section 1 as soon as we detect an existing workspace for your
          directory selection.
        </p>
      </section>

      <section
        id="onboarding-proposal"
        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-sm space-y-4"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-50">3. My Organization Is Not Listed</h2>
          <p className="text-sm text-slate-400 mt-1">
            Tell us about your agency. We&apos;ll review your request before creating a new organization—nothing
            goes live immediately.
          </p>
        </div>

        {proposalSuccess && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {proposalSuccess}
          </div>
        )}

        <form onSubmit={handleProposalSubmit} className="space-y-4">
          <div>
            <label htmlFor="onb-org-name" className="block text-xs font-medium text-slate-400 mb-1">
              Organization name *
            </label>
            <input
              id="onb-org-name"
              type="text"
              required
              value={addNewForm.name}
              onChange={(e) => setAddNewForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
              placeholder="e.g. Safe Harbor Advocacy Center"
            />
          </div>

          <div>
            <label htmlFor="onb-org-type" className="block text-xs font-medium text-slate-400 mb-1">
              Type *
            </label>
            <select
              id="onb-org-type"
              value={addNewForm.type}
              onChange={(e) =>
                setAddNewForm((p) => ({
                  ...p,
                  type: e.target.value as (typeof ORG_TYPES)[number]["value"],
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
            >
              {ORG_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="onb-address" className="block text-xs font-medium text-slate-400 mb-1">
              Address
            </label>
            <input
              id="onb-address"
              type="text"
              value={addNewForm.address}
              onChange={(e) => setAddNewForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
              placeholder="Street, city, state, ZIP"
            />
          </div>

          <div>
            <label htmlFor="onb-phone" className="block text-xs font-medium text-slate-400 mb-1">
              Phone
            </label>
            <input
              id="onb-phone"
              type="tel"
              value={addNewForm.phone}
              onChange={(e) => setAddNewForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
            />
          </div>

          <div>
            <label htmlFor="onb-website" className="block text-xs font-medium text-slate-400 mb-1">
              Website
            </label>
            <input
              id="onb-website"
              type="url"
              value={addNewForm.website}
              onChange={(e) => setAddNewForm((p) => ({ ...p, website: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
              placeholder="https://…"
            />
          </div>

          <div>
            <label htmlFor="onb-program-type" className="block text-xs font-medium text-slate-400 mb-1">
              Program type (e.g. domestic violence, CAC)
            </label>
            <input
              id="onb-program-type"
              type="text"
              value={addNewForm.program_type}
              onChange={(e) => setAddNewForm((p) => ({ ...p, program_type: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
            />
          </div>

          <div>
            <label htmlFor="onb-notes" className="block text-xs font-medium text-slate-400 mb-1">
              Additional notes (optional)
            </label>
            <textarea
              id="onb-notes"
              rows={3}
              value={addNewForm.notes}
              onChange={(e) => setAddNewForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
            />
          </div>

          {proposalErr && (
            <div className="text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
              {proposalErr}
            </div>
          )}

          <button
            type="submit"
            disabled={proposalLoading || !profileIsOrg}
            className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-white disabled:opacity-50"
          >
            {proposalLoading ? "Submitting…" : "Submit For Admin Review"}
          </button>
        </form>
      </section>
    </div>
  );
}
