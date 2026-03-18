"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type RequestRow = {
  id: string;
  created_at: string;
  organization_id: string;
  organization_name: string;
  request_kind: string;
  subject: string;
  body: string;
  status: string;
  designation_tier_snapshot: string | null;
  admin_response_org_visible: string | null;
};

export default function AdminDesignationReviewsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [resolution, setResolution] = useState("mark_in_review");
  const [orgVisible, setOrgVisible] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const q = showAll ? "?status=all" : "";
    const res = await fetch(`/api/admin/designation-reviews${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setErr(getApiErrorMessage(json, "Failed to load"));
      return;
    }
    const json = await res.json();
    setRequests(json.data?.requests ?? []);
    setErr(null);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [showAll]);

  const submitResolution = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/admin/designation-reviews/${selected.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resolution,
          admin_response_org_visible: orgVisible,
          admin_notes_internal: internalNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(getApiErrorMessage(json, "Update failed"));
        return;
      }
      setSelected(null);
      setOrgVisible("");
      setInternalNotes("");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const open = requests.filter((r) => r.status === "pending" || r.status === "in_review");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Admin</p>
            <h1 className="text-2xl font-bold">Designation review requests</h1>
          </div>
          <div className="flex gap-3 text-sm items-center">
            <label className="flex items-center gap-2 text-slate-400">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
              Show all
            </label>
            <Link href="/admin/designations" className="text-teal-400 hover:text-teal-200">
              Designations
            </Link>
          </div>
        </header>

        {err && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">
              Queue ({showAll ? requests.length : open.length} open / total)
            </h2>
            {loading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : (
              <ul className="space-y-2 text-xs max-h-[70vh] overflow-y-auto">
                {(showAll ? requests : open).map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r);
                        setResolution("mark_in_review");
                        setOrgVisible("");
                      }}
                      className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                        selected?.id === r.id
                          ? "border-teal-500 bg-teal-950/30"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <span className="text-teal-300">{r.organization_name}</span>
                      <span className="text-slate-500 ml-2">{r.status}</span>
                      <p className="text-slate-200 mt-0.5">{r.subject}</p>
                      <p className="text-slate-500 text-[10px] mt-1">
                        {r.request_kind} · tier at submit: {r.designation_tier_snapshot ?? "—"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-4">
            {!selected ? (
              <p className="text-sm text-slate-400">Select a request to review.</p>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold text-slate-100">{selected.subject}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {selected.organization_name} · {selected.request_kind}
                  </p>
                  <div className="mt-3 text-sm text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800 rounded p-3">
                    {selected.body}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Resolution</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
                  >
                    <option value="mark_in_review">Mark in review</option>
                    <option value="affirm">Affirm designation (close)</option>
                    <option value="recompute_designation">Recompute designation from grading (close)</option>
                    <option value="decline">Decline change (close)</option>
                  </select>
                </div>
                {resolution !== "mark_in_review" && (
                  <div>
                    <label className="text-xs text-slate-400">
                      Response visible to organization (min 10 chars)
                    </label>
                    <textarea
                      value={orgVisible}
                      onChange={(e) => setOrgVisible(e.target.value)}
                      rows={4}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
                      placeholder="Calm, non-punitive language. Do not share numeric scores."
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-slate-400">Internal notes (optional)</label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={submitResolution}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Submit"}
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
