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
  const { refetchMe, role, realRole, isAdmin } = useAuth();

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

  const clearFindConflict = () => {
    setExistingOrgId(null);
    setExistingOrgName(null);
    setFindErr(null);
  };

  const handleCatalogChange = (id: number | null, program: IlVictimAssistanceProgram | null) => {
    setCatalogId(id);
    setSelectedProgram(program);
    clearFindConflict();
    setFindSuccess(null);
  };

  const getToken = async (): Promise<string | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
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
    if (existingOrgId) {
      setFindErr("This directory entry already has a workspace. Request to join instead.");
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
        setFindErr(getApiErrorMessage(json, "Could not link this directory entry."));
        return;
      }
      await refetchMe();
      setFindSuccess("Organization linked. Redirecting you to your workspace…");
      router.push("/organization/dashboard");
      router.refresh();
    } finally {
      setClaimLoading(false);
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
        "Request sent. People who manage that organization or an administrator will be notified. Watch your updates for a response."
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

  const joinPanel = existingOrgId ? (
    <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <p className="text-sm text-amber-100">
        <span className="font-medium">{existingOrgName}</span> already has a NxtStps workspace for this
        directory entry. You can request access—nothing new is created automatically.
      </p>
      <button
        type="button"
        onClick={handleRequestToJoin}
        disabled={requestingJoin}
        className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
      >
        {requestingJoin ? "Sending request…" : "Request to join this organization"}
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

      {findSuccess && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {findSuccess}
        </div>
      )}

      <section
        id="onboarding-find"
        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-sm space-y-4"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-50">1. Find my organization</h2>
          <p className="text-sm text-slate-400 mt-1">
            Search the Illinois Crime Victim Assistance Services directory, then link your agency or request
            access if a workspace already exists.
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

          {selectedProgram && !existingOrgId && (
            <p className="text-xs text-slate-500 leading-relaxed">
              Selected: #{selectedProgram.id} · {selectedProgram.organization} — {selectedProgram.programType}
            </p>
          )}

          {!existingOrgId && catalogId != null && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm text-slate-300 space-y-2">
              <p className="text-slate-200 font-medium">Directory claim (verified listing)</p>
              <p>
                This listing comes from the verified Illinois directory. If no duplicate workspace exists,
                you can link it to your account and become the organization owner. We don&apos;t create a
                second organization for the same directory entry.
              </p>
              <button
                type="submit"
                disabled={claimLoading || !profileIsOrg}
                className="mt-2 w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {claimLoading ? "Working…" : "Link directory entry — I’ll be the organization owner"}
              </button>
            </div>
          )}

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
          <h2 className="text-lg font-semibold text-slate-50">2. Request to join an existing organization</h2>
          <p className="text-sm text-slate-400 mt-1">
            Use the directory in step 1. When your agency already has a workspace, you&apos;ll see a{" "}
            <span className="text-slate-300">Request to join</span> option instead of claiming it.
          </p>
        </div>
        <p className="text-sm text-slate-500">
          We&apos;ll notify people who manage that organization (or an administrator). You won&apos;t create a
          duplicate org from this action.
        </p>
        <p className="text-xs text-slate-600">
          After you select your agency in step 1, if a workspace already exists you&apos;ll see{" "}
          <span className="text-slate-400">Request to join this organization</span> there—use that to start
          the request.
        </p>
      </section>

      <section
        id="onboarding-proposal"
        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-sm space-y-4"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-50">3. My organization is not listed</h2>
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
            {proposalLoading ? "Submitting…" : "Submit for admin review"}
          </button>
        </form>
      </section>
    </div>
  );
}
