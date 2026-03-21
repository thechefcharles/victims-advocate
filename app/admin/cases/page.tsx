"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  APP_EMPTY_STATE,
  APP_PAGE_MAIN,
  APP_TABLE,
  APP_TABLE_CELL,
  APP_TABLE_CELL_RIGHT,
  APP_TABLE_HEAD_CELL,
  APP_TABLE_HEAD_CELL_RIGHT,
  APP_TABLE_ROW,
  APP_TABLE_WRAP,
} from "@/lib/ui/appSurface";

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
const { data: sessionData } = await supabase.auth.getSession();
const accessToken = sessionData.session?.access_token;

if (!accessToken) {
  console.error("No session token; redirecting to login");
  window.location.href = "/login";
  return;
}

const res = await fetch("/api/compensation/cases", {
  method: "GET",
  headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
});
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
      <main className={APP_PAGE_MAIN}>
        <div className="max-w-5xl mx-auto">Loading cases…</div>
      </main>
    );
  }

  return (
    <main className={APP_PAGE_MAIN}>
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          contextLine="Admin → Cases"
          eyebrow="Admin · Cases"
          title="Saved compensation cases"
          subtitle="Cases load from your database. Each row includes the full application and attached documents."
          rightActions={
            <>
              <Link href="/admin/audit" className="text-sm text-slate-400 hover:text-slate-200">
                Audit
              </Link>
              <Link href="/admin/orgs" className="text-sm text-slate-400 hover:text-slate-200">
                Organizations
              </Link>
              <Link href="/admin/policies" className="text-sm text-slate-400 hover:text-slate-200">
                Policies
              </Link>
              <Link href="/admin/users" className="text-sm text-slate-400 hover:text-slate-200">
                Users
              </Link>
              <Link href="/admin/ecosystem" className="text-sm text-teal-400 hover:text-teal-200">
                Ecosystem
              </Link>
              <Link
                href="/admin/grading"
                className="inline-flex items-center rounded-md bg-slate-700 px-2.5 py-1 text-sm font-medium text-white hover:bg-slate-600"
              >
                Review
              </Link>
            </>
          }
        />

        {cases.length === 0 ? (
          <div className={APP_EMPTY_STATE}>
            <p className="font-medium text-slate-300">No cases yet.</p>
            <p className="mt-2 text-xs text-slate-500">
              Complete an intake and use Save on the summary step to create a case record.
            </p>
          </div>
        ) : (
          <section className={APP_TABLE_WRAP}>
            <table className={APP_TABLE}>
              <thead>
                <tr>
                  <th className={APP_TABLE_HEAD_CELL}>Victim</th>
                  <th className={APP_TABLE_HEAD_CELL}>City</th>
                  <th className={APP_TABLE_HEAD_CELL}>Date of crime</th>
                  <th className={APP_TABLE_HEAD_CELL}>Created</th>
                  <th className={APP_TABLE_HEAD_CELL}>Status</th>
                  <th className={APP_TABLE_HEAD_CELL_RIGHT}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const v = c.application.victim || {};
                  const cr = c.application.crime || {};

                  return (
                    <tr key={c.id} className={APP_TABLE_ROW}>
                      <td className={APP_TABLE_CELL}>
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-100">
                            {(v.firstName || "") +
                              (v.firstName || v.lastName ? " " : "") +
                              (v.lastName || "") || "Unknown victim"}
                          </span>
                          <div className="text-[11px] text-slate-500">
                            DOB: {v.dateOfBirth || "—"}
                          </div>
                        </div>
                      </td>
                      <td className={`${APP_TABLE_CELL} text-[11px]`}>
                        {v.city || cr.crimeCity || "—"}
                        {v.state || cr.crimeCounty
                          ? `, ${v.state || cr.crimeCounty}`
                          : ""}
                      </td>
                      <td className={`${APP_TABLE_CELL} text-[11px]`}>{cr.dateOfCrime || "—"}</td>
                      <td className={`${APP_TABLE_CELL} text-[11px]`}>{formatDate(c.created_at)}</td>
                      <td className={`${APP_TABLE_CELL} text-[11px]`}>
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
                      <td className={APP_TABLE_CELL_RIGHT}>
                        <Link
                          href={`/admin/cases/${c.id}`}
                          className="text-emerald-400 hover:text-emerald-300 text-[11px] font-medium"
                        >
                          Open
                        </Link>
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