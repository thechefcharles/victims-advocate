"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import {
  TRUST_LINK_HREF,
  TRUST_LINK_LABELS,
  TRUST_MICROCOPY,
  designationTierBadgeText,
  formatReviewStatusLabel,
} from "@/lib/trustDisplay";
import { PageHeader } from "@/components/layout/PageHeader";

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

function formatSubmitted(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function isOpenStatus(status: string) {
  return status === "pending" || status === "in_review";
}

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
  const orgResponseRef = useRef<HTMLTextAreaElement>(null);

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

  const { pending, inReview, resolved } = useMemo(() => {
    const pendingList = requests.filter((r) => r.status === "pending");
    const inReviewList = requests.filter((r) => r.status === "in_review");
    const resolvedList = requests.filter((r) => !isOpenStatus(r.status));
    return { pending: pendingList, inReview: inReviewList, resolved: resolvedList };
  }, [requests]);

  const submitResolution = async (forcedResolution?: string) => {
    if (!selected) return;
    const resVal = forcedResolution ?? resolution;
    if (resVal !== "mark_in_review" && orgVisible.trim().length < 10) {
      orgResponseRef.current?.focus();
      return;
    }
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
          resolution: resVal,
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

  const selectRequest = (r: RequestRow) => {
    setSelected(r);
    setResolution("mark_in_review");
    setOrgVisible("");
    setInternalNotes("");
  };

  const openRequests = requests.filter((r) => isOpenStatus(r.status));

  const RequestCard = ({ r }: { r: RequestRow }) => {
    const active = selected?.id === r.id;
    return (
      <button
        type="button"
        onClick={() => selectRequest(r)}
        className={`w-full text-left rounded-xl border px-3 py-3 transition ${
          active
            ? "border-teal-500 bg-teal-950/30"
            : "border-slate-700 hover:border-slate-600 bg-slate-950/30"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-teal-200">{r.organization_name}</span>
          <span className="text-[10px] font-medium rounded-full border border-slate-600 px-1.5 py-0.5 text-slate-300">
            {formatReviewStatusLabel(r.status)}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Submitted {formatSubmitted(r.created_at)} · {r.request_kind.replace(/_/g, " ")}
        </p>
        <p className="text-sm text-slate-200 mt-1 line-clamp-2">{r.subject}</p>
        {r.admin_response_org_visible && (
          <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-800 pt-2">
            <span className="text-slate-400">Admin response: </span>
            {r.admin_response_org_visible}
          </p>
        )}
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          contextLine="Admin → Designation reviews"
          eyebrow="Admin"
          title="Designation reviews"
          subtitle="Review and resolve organization designation requests."
          meta={
            <>
              <p className="leading-relaxed mb-2">
                {TRUST_MICROCOPY.designationNotRating} Resolve formal org requests with a written
                response; do not share numeric scores.
              </p>
              <p className="border-l-2 border-slate-700 pl-3 mb-2">
                Organizations can request clarification or updates to their designation.
              </p>
              <a href={TRUST_LINK_HREF.designations} className="text-teal-400/90 hover:underline">
                {TRUST_LINK_LABELS.aboutDesignations}
              </a>
            </>
          }
          rightActions={
            <>
              <label className="flex items-center gap-2 text-slate-400 text-sm">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={(e) => setShowAll(e.target.checked)}
                />
                Show all
              </label>
              <Link href="/admin/designations" className="text-teal-400 hover:text-teal-200 text-sm">
                Designations
              </Link>
            </>
          }
        />

        {err && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <h2 className="text-sm font-semibold text-slate-200 mb-1">Active requests</h2>
              <p className="text-xs text-slate-500 mb-4">
                {showAll
                  ? `${openRequests.length} open · ${resolved.length} resolved`
                  : `${openRequests.length} open (pending or in review)`}
              </p>
              {loading ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : requests.length === 0 ? (
                <p className="text-sm text-slate-400 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-4">
                  No designation requests yet. When organizations submit requests, they will appear
                  here for you to review.
                </p>
              ) : showAll ? (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                  {pending.length === 0 && inReview.length === 0 ? (
                    <p className="text-sm text-slate-400 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-4">
                      No open requests. Resolved items are listed below when &quot;Show all&quot; is on.
                    </p>
                  ) : null}
                  {pending.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Pending
                      </h3>
                      <ul className="space-y-2">
                        {pending.map((r) => (
                          <li key={r.id}>
                            <RequestCard r={r} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {inReview.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        In review
                      </h3>
                      <ul className="space-y-2">
                        {inReview.map((r) => (
                          <li key={r.id}>
                            <RequestCard r={r} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <ul className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {openRequests.map((r) => (
                    <li key={r.id}>
                      <RequestCard r={r} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {showAll && resolved.length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Resolved</h2>
                <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {resolved.map((r) => (
                    <li key={r.id}>
                      <RequestCard r={r} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-4 min-h-[320px]">
            {!selected ? (
              <p className="text-sm text-slate-400">Select a request to review.</p>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold text-slate-100">{selected.organization_name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Submitted {formatSubmitted(selected.created_at)} ·{" "}
                    {selected.request_kind.replace(/_/g, " ")} ·{" "}
                    <span className="text-slate-400">{formatReviewStatusLabel(selected.status)}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Tier at submit:{" "}
                    {designationTierBadgeText(selected.designation_tier_snapshot) ??
                      selected.designation_tier_snapshot ??
                      "—"}
                  </p>
                  <h4 className="text-sm font-medium text-slate-200 mt-3">{selected.subject}</h4>
                  <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800 rounded-lg p-3 bg-slate-950/40">
                    {selected.body}
                  </div>
                  {selected.admin_response_org_visible && (
                    <div className="mt-3 text-xs text-slate-400 border border-slate-800 rounded-lg p-3">
                      <span className="text-slate-500">Admin response (visible to org): </span>
                      {selected.admin_response_org_visible}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Actions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={submitting || !isOpenStatus(selected.status)}
                      onClick={() => {
                        setResolution("mark_in_review");
                        void submitResolution("mark_in_review");
                      }}
                      className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-800 disabled:opacity-40"
                    >
                      Mark in Review
                    </button>
                    <button
                      type="button"
                      disabled={submitting || !isOpenStatus(selected.status)}
                      onClick={() => {
                        setResolution("affirm");
                        orgResponseRef.current?.focus();
                      }}
                      className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-950/50 disabled:opacity-40"
                    >
                      Affirm
                    </button>
                    <button
                      type="button"
                      disabled={submitting || !isOpenStatus(selected.status)}
                      onClick={() => {
                        setResolution("recompute_designation");
                        orgResponseRef.current?.focus();
                      }}
                      className="rounded-lg border border-teal-700/50 bg-teal-950/30 px-3 py-2 text-xs font-medium text-teal-200 hover:bg-teal-950/50 disabled:opacity-40"
                    >
                      Recompute Designation
                    </button>
                    <button
                      type="button"
                      disabled={submitting || !isOpenStatus(selected.status)}
                      onClick={() => {
                        setResolution("decline");
                        orgResponseRef.current?.focus();
                      }}
                      className="rounded-lg border border-amber-900/50 bg-amber-950/25 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-950/45 disabled:opacity-40"
                    >
                      Decline
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400">Resolution</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
                  >
                    <option value="mark_in_review">Mark in Review</option>
                    <option value="affirm">Affirm</option>
                    <option value="recompute_designation">Recompute Designation</option>
                    <option value="decline">Decline</option>
                  </select>
                </div>
                {resolution !== "mark_in_review" && (
                  <div>
                    <label className="text-xs text-slate-400">
                      Response visible to organization (min 10 characters)
                    </label>
                    <textarea
                      ref={orgResponseRef}
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
                  disabled={submitting || !isOpenStatus(selected.status)}
                  onClick={() => void submitResolution()}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
                >
                  {submitting ? "Updating…" : "Update"}
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
