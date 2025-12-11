"use client";

import { useEffect, useState } from "react";
import type { CompensationApplication } from "@/lib/compensationSchema";

type CaseStatus = "draft" | "ready_for_review" | "submitted" | "closed";

interface ApiCaseRow {
  id: string;
  created_at: string;
  status: CaseStatus;
  application: any;
}

export default function CasesPage() {
  const [cases, setCases] = useState<ApiCaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/compensation/cases");
        if (!res.ok) {
          console.error("Failed to fetch cases", await res.text());
          setCases([]);
          return;
        }
        const json = await res.json();
        setCases(json.cases ?? []);
      } catch (err) {
        console.error("Error fetching cases", err);
        setCases([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
        <div className="max-w-5xl mx-auto">Loading cases…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
            Admin · Cases (Supabase)
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Saved compensation cases
          </h1>
          <p className="text-sm text-slate-300">
            These cases are loaded from your Supabase database (not
            localStorage). Each one includes the full application and any
            attached documents.
          </p>
        </header>

        {cases.length === 0 ? (
          <p className="text-xs text-slate-400">
            No cases saved yet. Complete an intake and click &quot;Save as case&quot;
            on the summary screen to see it appear here.
          </p>
        ) : (
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left py-2 pr-3 font-normal">Victim</th>
                  <th className="text-left py-2 pr-3 font-normal">City</th>
                  <th className="text-left py-2 pr-3 font-normal">
                    Date of crime
                  </th>
                  <th className="text-left py-2 pr-3 font-normal">
                    Created
                  </th>
                  <th className="text-left py-2 pr-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const v = c.application.victim || {};
                  const cr = c.application.crime || {};

                  return (
                    <tr
                      key={c.id}
                      className="border-b border-slate-900 hover:bg-slate-900/60"
                    >
                      <td className="py-2 pr-3 align-top">
                        <div className="space-y-0.5">
                          <a
                            href={`/admin/cases/${c.id}`}
                            className="font-semibold text-slate-100 hover:text-emerald-300 hover:underline underline-offset-2"
                          >
                            {(v.firstName || "") +
                              (v.firstName || v.lastName ? " " : "") +
                              (v.lastName || "") || "Unknown victim"}
                          </a>
                          <div className="text-[11px] text-slate-400">
                            DOB: {v.dateOfBirth || "—"}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-3 align-top text-[11px] text-slate-300">
                        {v.city || cr.crimeCity || "—"}
                        {v.state || cr.crimeCounty
                          ? `, ${v.state || cr.crimeCounty}`
                          : ""}
                      </td>
                      <td className="py-2 pr-3 align-top text-[11px] text-slate-300">
                        {cr.dateOfCrime || "—"}
                      </td>
                      <td className="py-2 pr-3 align-top text-[11px] text-slate-300">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="py-2 pr-3 align-top text-[11px]">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                            c.status === "ready_for_review"
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                              : "bg-slate-800 text-slate-300 border border-slate-600"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        <p className="text-[11px] text-slate-500">
          This view reads from your Supabase backend. In a production version,
          advocates would see only the cases they are authorized to access,
          governed by role-based permissions and RLS.
        </p>
      </div>
    </main>
  );
}