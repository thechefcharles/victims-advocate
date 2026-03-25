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

type Mode = "directory" | "add_new";

type Props = {
  onSuccess?: () => void;
  backLink?: React.ReactNode;
  /** Pre-selected catalog id (e.g. from pending_org_catalog_entry_id) */
  initialCatalogId?: number | null;
  /** Prefill "add new organization" name from signup hints (does not create an org). */
  initialOrgNameHint?: string | null;
};

export function OrganizationCreationSection({
  onSuccess,
  backLink,
  initialCatalogId = null,
  initialOrgNameHint = null,
}: Props) {
  const router = useRouter();
  const { refetchMe } = useAuth();
  const [mode, setMode] = useState<Mode>("directory");
  const [catalogId, setCatalogId] = useState<number | null>(initialCatalogId);
  const [existingOrgId, setExistingOrgId] = useState<string | null>(null);
  const [existingOrgName, setExistingOrgName] = useState<string | null>(null);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [addNewForm, setAddNewForm] = useState({
    name: "",
    type: "nonprofit",
    address: "",
    phone: "",
    website: "",
    program_type: "",
    notes: "",
  });

  useEffect(() => {
    const hint = initialOrgNameHint?.trim();
    if (!hint) return;
    setAddNewForm((f) => (f.name.trim() ? f : { ...f, name: hint }));
  }, [initialOrgNameHint]);

  const handleDirectorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setExistingOrgId(null);
    setExistingOrgName(null);
    if (catalogId == null) {
      setErr("Please select your organization from the Illinois victim assistance directory.");
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setErr("Please sign in first.");
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
      if (!res.ok) {
        if (json.code === "ORG_ALREADY_EXISTS" && json.meta?.organization_id) {
          setExistingOrgId(json.meta.organization_id);
          setExistingOrgName(json.meta.organization_name ?? "this organization");
        } else {
          setErr(getApiErrorMessage(json, "Could not create organization"));
        }
        return;
      }
      await refetchMe();
      setSuccessMsg("Organization created. Redirecting…");
      onSuccess?.();
      router.push("/organization/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleRequestToJoin = async () => {
    if (!existingOrgId) return;
    setRequestingJoin(true);
    setErr(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setErr("Please sign in first.");
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
        setErr(getApiErrorMessage(json, "Could not submit request"));
        return;
      }
      setSuccessMsg(
        "Request sent. The organization admin will review it. You'll see an update in your notifications."
      );
      setExistingOrgId(null);
      setExistingOrgName(null);
    } finally {
      setRequestingJoin(false);
    }
  };

  const handleAddNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!addNewForm.name.trim()) {
      setErr("Organization name is required.");
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setErr("Please sign in first.");
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
        setErr(getApiErrorMessage(json, "Could not submit proposal"));
        return;
      }
      setSuccessMsg(
        "Your organization has been submitted for review. An administrator will approve it soon. You'll receive a notification when it's ready."
      );
      setAddNewForm({
        name: "",
        type: "nonprofit",
        address: "",
        phone: "",
        website: "",
        program_type: "",
        notes: "",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {backLink}

      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => {
            setMode("directory");
            setErr(null);
            setExistingOrgId(null);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            mode === "directory"
              ? "bg-slate-700 text-slate-100"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Select from directory
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("add_new");
            setErr(null);
            setExistingOrgId(null);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            mode === "add_new"
              ? "bg-slate-700 text-slate-100"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          My organization isn&apos;t listed
        </button>
      </div>

      {successMsg && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {successMsg}
        </div>
      )}

      {mode === "directory" ? (
        <form
          onSubmit={handleDirectorySubmit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6"
        >
          <ProgramCatalogSelect
            id="org-catalog"
            label="Your organization (Illinois victim assistance directory)"
            required
            value={catalogId}
            onChange={(id: number | null, _p: IlVictimAssistanceProgram | null) => {
              setCatalogId(id);
              setExistingOrgId(null);
            }}
          />

          {existingOrgId ? (
            <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <p className="text-sm text-amber-200">
                {existingOrgName} already has a NxtStps account. Request to join instead.
              </p>
              <button
                type="button"
                onClick={handleRequestToJoin}
                disabled={requestingJoin}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {requestingJoin ? "Sending…" : "Request to join"}
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading || catalogId == null}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create organization"}
            </button>
          )}
        </form>
      ) : (
        <form
          onSubmit={handleAddNewSubmit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6"
        >
          <p className="text-sm text-slate-400">
            Submit your organization details. An administrator will review and approve your
            request. You&apos;ll be notified when it&apos;s ready.
          </p>

          <div>
            <label htmlFor="org-name" className="block text-xs font-medium text-slate-400 mb-1">
              Organization name *
            </label>
            <input
              id="org-name"
              type="text"
              required
              value={addNewForm.name}
              onChange={(e) => setAddNewForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
              placeholder="e.g. Safe Harbor Advocacy Center"
            />
          </div>

          <div>
            <label htmlFor="org-type" className="block text-xs font-medium text-slate-400 mb-1">
              Type *
            </label>
            <select
              id="org-type"
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
            <label htmlFor="org-address" className="block text-xs font-medium text-slate-400 mb-1">
              Address
            </label>
            <input
              id="org-address"
              type="text"
              value={addNewForm.address}
              onChange={(e) => setAddNewForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
              placeholder="Street address, city, state, zip"
            />
          </div>

          <div>
            <label htmlFor="org-phone" className="block text-xs font-medium text-slate-400 mb-1">
              Phone
            </label>
            <input
              id="org-phone"
              type="tel"
              value={addNewForm.phone}
              onChange={(e) => setAddNewForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label htmlFor="org-website" className="block text-xs font-medium text-slate-400 mb-1">
              Website
            </label>
            <input
              id="org-website"
              type="url"
              value={addNewForm.website}
              onChange={(e) => setAddNewForm((p) => ({ ...p, website: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
              placeholder="https://..."
            />
          </div>

          <div>
            <label htmlFor="org-program-type" className="block text-xs font-medium text-slate-400 mb-1">
              Program type (e.g. Domestic Violence, CAC)
            </label>
            <input
              id="org-program-type"
              type="text"
              value={addNewForm.program_type}
              onChange={(e) => setAddNewForm((p) => ({ ...p, program_type: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
              placeholder="Domestic Violence"
            />
          </div>

          <div>
            <label htmlFor="org-notes" className="block text-xs font-medium text-slate-400 mb-1">
              Additional notes (optional)
            </label>
            <textarea
              id="org-notes"
              rows={3}
              value={addNewForm.notes}
              onChange={(e) => setAddNewForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50"
              placeholder="Any other details for the review"
            />
          </div>

          {err && (
            <div className="text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit for approval"}
          </button>
        </form>
      )}

      {mode === "directory" && err && !existingOrgId && (
        <div className="text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
          {err}
        </div>
      )}
    </div>
  );
}
