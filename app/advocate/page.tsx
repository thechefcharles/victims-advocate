"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type CaseStatus = "draft" | "ready_for_review" | "submitted" | "closed";

type CaseRow = {
  id: string;
  status: CaseStatus;
  state_code: string;
  created_at: string;
  updated_at: string;
  application: any;
  access: {
    role: "owner" | "advocate";
    can_view: boolean;
    can_edit: boolean;
  } | null;
};

export default function AdvocateDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<CaseRow[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          window.location.href = "/login";
          return;
        }

        const res = await fetch("/api/advocate/cases", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.error("Failed to load advocate cases:", await res.text());
          setCases([]);
          return;
        }

        const json = await res.json();
        setCases(json.cases ?? []);
      } catch (e) {
        console.error("Advocate cases load error", e);
        setCases([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-5xl mx-auto">Loading cases…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            Advocate
          </p>
          <h1 className="text-2xl font-semibold">Case inbox</h1>
          <p className="text-sm text-slate-300">
            These are cases you’ve been granted permission to view or edit.
          </p>
        </header>

        {cases.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-300">
            No cases yet. Ask a victim to invite you, or add access in the database.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-2">Victim</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Access</th>
                  <th className="text-left py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const app =
                    typeof c.application === "string"
                      ? JSON.parse(c.application)
                      : c.application;

                  const v = app?.victim ?? {};
                  const victimName =
                    (v.firstName || "") +
                      (v.firstName || v.lastName ? " " : "") +
                      (v.lastName || "") || "Unknown victim";

                  return (
                    <tr key={c.id} className="border-b border-slate-900">
                      <td className="py-2">
                        <Link
                          href={`/compensation/intake?case=${c.id}`}
                          className="font-semibold text-slate-100 hover:text-emerald-300 hover:underline underline-offset-2"
                        >
                          {victimName}
                        </Link>
                        <div className="text-[11px] text-slate-500">
                          {c.state_code} · {c.id.slice(0, 8)}…
                        </div>
                      </td>
                      <td className="py-2 text-slate-200">{c.status}</td>
                      <td className="py-2 text-slate-300">
                        {c.access?.can_edit ? "Edit" : "View-only"}
                      </td>
                      <td className="py-2 text-slate-400">
                        {formatDate(c.updated_at || c.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-slate-500">
          Opening a case takes you into the same guided intake flow, with permission-based editing.
        </p>
      </div>
    </main>
  );
}